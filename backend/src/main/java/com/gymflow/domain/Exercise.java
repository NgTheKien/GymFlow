package com.gymflow.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "exercises")
@Getter
@Setter
@NoArgsConstructor
public class Exercise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "muscle_group", nullable = false)
    private MuscleGroup muscleGroup;

    private String equipment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Level level = Level.BEGINNER;

    private String description;

    private String instructions;

    @Column(name = "video_url")
    private String videoUrl;

    /** Bài tập đã nằm trong kế hoạch thì chỉ ẩn, không xoá cứng. */
    @Column(nullable = false)
    private boolean hidden = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
