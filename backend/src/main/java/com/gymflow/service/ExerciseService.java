package com.gymflow.service;

import com.gymflow.common.ApiException;
import com.gymflow.domain.Exercise;
import com.gymflow.domain.Level;
import com.gymflow.domain.MuscleGroup;
import com.gymflow.dto.Dtos.*;
import com.gymflow.repository.ExerciseRepository;
import com.gymflow.repository.UserRepository;
import com.gymflow.repository.WorkoutPlanItemRepository;
import com.gymflow.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final WorkoutPlanItemRepository planItemRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final Mappers mappers;

    /** Hội viên không thấy bài đã ẩn; HLV/quản lý xem được khi bật includeHidden. */
    @Transactional(readOnly = true)
    public List<ExerciseResponse> list(AuthUser user, String q, MuscleGroup group, Level level, boolean includeHidden) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        boolean showHidden = includeHidden && !user.isMember();
        return exerciseRepository.findAllByOrderByNameAsc().stream()
                .filter(e -> showHidden || !e.isHidden())
                .filter(e -> group == null || e.getMuscleGroup() == group)
                .filter(e -> level == null || e.getLevel() == level)
                .filter(e -> needle.isEmpty() || e.getName().toLowerCase(Locale.ROOT).contains(needle)
                        || (e.getEquipment() != null && e.getEquipment().toLowerCase(Locale.ROOT).contains(needle)))
                .map(mappers::exercise).toList();
    }

    @Transactional
    public ExerciseResponse create(AuthUser user, ExerciseRequest req) {
        if (exerciseRepository.existsByNameIgnoreCase(req.name().trim())) throw ApiException.conflict("Tên bài tập đã tồn tại");
        Exercise e = new Exercise();
        apply(e, req);
        e.setCreatedBy(userRepository.getReferenceById(user.id()));
        exerciseRepository.save(e);
        auditService.log("EXERCISE_CREATE", "EXERCISE", e.getId(), e.getName());
        return mappers.exercise(e);
    }

    @Transactional
    public ExerciseResponse update(Long id, ExerciseRequest req) {
        Exercise e = load(id);
        if (exerciseRepository.existsByNameIgnoreCaseAndIdNot(req.name().trim(), id)) throw ApiException.conflict("Tên bài tập đã tồn tại");
        apply(e, req);
        auditService.log("EXERCISE_UPDATE", "EXERCISE", e.getId(), e.getName());
        return mappers.exercise(e);
    }

    @Transactional
    public ExerciseResponse setHidden(Long id, boolean hidden) {
        Exercise e = load(id);
        e.setHidden(hidden);
        auditService.log(hidden ? "EXERCISE_HIDE" : "EXERCISE_SHOW", "EXERCISE", e.getId(), e.getName());
        return mappers.exercise(e);
    }

    /** Bài đã nằm trong giáo án chỉ được ẩn, không xoá (giữ nguyên giáo án cũ). */
    @Transactional
    public void delete(Long id) {
        Exercise e = load(id);
        if (planItemRepository.existsByExerciseId(id)) {
            throw ApiException.conflict("Bài tập đang được dùng trong giáo án, hãy ẩn thay vì xoá");
        }
        exerciseRepository.delete(e);
        auditService.log("EXERCISE_DELETE", "EXERCISE", id, e.getName());
    }

    private void apply(Exercise e, ExerciseRequest req) {
        e.setName(req.name().trim());
        e.setMuscleGroup(req.muscleGroup());
        e.setEquipment(Mappers.blankToNull(req.equipment()));
        e.setLevel(req.level());
        e.setDescription(Mappers.blankToNull(req.description()));
        e.setInstructions(Mappers.blankToNull(req.instructions()));
        e.setVideoUrl(Mappers.blankToNull(req.videoUrl()));
    }

    Exercise load(Long id) {
        return exerciseRepository.findById(id).orElseThrow(() -> ApiException.notFound("bài tập"));
    }
}
