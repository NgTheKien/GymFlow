import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { ContentOrigin, Exercise, ExerciseGoal, ExerciseLocation, Level, MuscleGroup, ReviewStatus, Source } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { HealthDisclaimer, InfoRow, Missing, SourceList } from '../../components/Content';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, SearchInput, Select, StatusBadge, Textarea } from '../../components/ui';
import { fmtDateTime, goalLabel, levelLabel, locationLabel, muscleColor, muscleLabel, reviewLabel } from '../../lib/format';
import { errMsg, fieldErrs, useAsync, useDebounced } from '../../lib/hooks';
import { t } from '../../i18n';

const GROUPS = Object.keys(muscleLabel) as MuscleGroup[];
const LOCATIONS = Object.keys(locationLabel) as ExerciseLocation[];
const GOALS = Object.keys(goalLabel) as ExerciseGoal[];
const REVIEWS = Object.keys(reviewLabel) as ReviewStatus[];

export default function Exercises() {
  const me = useMe();
  const staff = me.role !== 'MEMBER';
  const toast = useToast();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<'' | MuscleGroup>('');
  const [level, setLevel] = useState<'' | Level>('');
  const [location, setLocation] = useState<'' | ExerciseLocation>('');
  const [goal, setGoal] = useState<'' | ExerciseGoal>('');
  const [review, setReview] = useState<'' | ReviewStatus>('');
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [removing, setRemoving] = useState<Exercise | null>(null);
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useAsync(
    () => api.get<Exercise[]>('/exercises', { q: dq, muscleGroup: group, level, location, goal, reviewStatus: review, includeHidden: showHidden }),
    [dq, group, level, location, goal, review, showHidden]);
  const counts = useMemo(() => {
    const c: Partial<Record<MuscleGroup, number>> = {};
    data?.forEach((e) => { c[e.muscleGroup] = (c[e.muscleGroup] ?? 0) + 1; });
    return c;
  }, [data]);
  const pendingCount = data?.filter((e) => e.reviewStatus !== 'APPROVED').length ?? 0;
  const viewing = data?.find((e) => e.id === viewingId) ?? null;

  const toggleHidden = async (e: Exercise) => {
    try { await api.put(`/exercises/${e.id}/hidden`, { hidden: !e.hidden }); toast.success(e.hidden ? 'Đã hiện bài tập' : 'Đã ẩn bài tập'); void reload(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="page">
      <PageHead eyebrow="Huấn luyện" title="Thư viện bài tập"
        desc="Mỗi bài có nguồn tham khảo, giấy phép và trạng thái duyệt. Bài đã nằm trong giáo án chỉ được ẩn, không xoá để giữ nguyên lịch sử."
        actions={staff && <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Thêm bài tập</Button>} />

      {data && pendingCount > 0 && (
        <Alert kind="warning">
          {t('{n} bài đang chờ quản lý duyệt. Nội dung chỉ mang tính tham khảo, chưa được chuyên gia y tế xác minh.', { n: pendingCount })}
        </Alert>
      )}

      <div className="toolbar mt-16">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm tên Việt/Anh, tên khác, dụng cụ…" />
        <Select value={level} onChange={(e) => setLevel(e.target.value as Level | '')} aria-label="Cấp độ">
          <option value="">{t('Mọi cấp độ')}</option>
          {(Object.keys(levelLabel) as Level[]).map((l) => <option key={l} value={l}>{levelLabel[l][0]}</option>)}
        </Select>
        <Select value={location} onChange={(e) => setLocation(e.target.value as ExerciseLocation | '')} aria-label="Nơi tập">
          <option value="">{t('Mọi nơi tập')}</option>
          {LOCATIONS.filter((l) => l !== 'ANY').map((l) => <option key={l} value={l}>{locationLabel[l]}</option>)}
        </Select>
        <Select value={goal} onChange={(e) => setGoal(e.target.value as ExerciseGoal | '')} aria-label="Mục tiêu">
          <option value="">{t('Mọi mục tiêu')}</option>
          {GOALS.map((g) => <option key={g} value={g}>{goalLabel[g]}</option>)}
        </Select>
        {staff && (
          <Select value={review} onChange={(e) => setReview(e.target.value as ReviewStatus | '')} aria-label="Trạng thái duyệt">
            <option value="">{t('Mọi trạng thái duyệt')}</option>
            {REVIEWS.map((r) => <option key={r} value={r}>{reviewLabel[r][0]}</option>)}
          </Select>
        )}
        {staff && <label className="check"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />{t('Hiện cả bài đã ẩn')}</label>}
      </div>
      <div className="chips" style={{ marginBottom: 18 }}>
        <button className={`chip ${group === '' ? 'on' : ''}`} onClick={() => setGroup('')}>{t('Tất cả')}</button>
        {GROUPS.map((g) => <button key={g} className={`chip ${group === g ? 'on' : ''}`} onClick={() => setGroup(g)}>{muscleLabel[g]}{group === '' && counts[g] ? ` · ${counts[g]}` : ''}</button>)}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <LoadingBlock rows={6} /> : data && data.length === 0 ? (
        <Card><Empty icon="dumbbell" title="Không có bài tập phù hợp" /></Card>
      ) : (
        <div className="grid grid-3">
          {data?.map((e) => (
            <Card key={e.id} className="hoverable ex-card" >
              <div className="top">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div className="muscle-ic" style={{ ['--c' as string]: muscleColor[e.muscleGroup] }}><Icon name="dumbbell" /></div>
                  <div>
                    <b style={{ fontSize: 15 }}>{e.name}</b>
                    <div className="tiny muted">{muscleLabel[e.muscleGroup]} · {e.equipment ?? t('Không dụng cụ')}{e.location && ` · ${locationLabel[e.location]}`}</div>
                  </div>
                </div>
                <StatusBadge map={levelLabel} value={e.level} />
              </div>
              {e.description && <p className="small muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</p>}
              <div className="row row-wrap" style={{ gap: 6 }}>
                <StatusBadge map={reviewLabel} value={e.reviewStatus} />
                <span className="tiny faint">{e.sources.length > 0 ? t('{n} nguồn', { n: e.sources.length }) : t('Chưa có nguồn')}</span>
              </div>
              <div className="row between">
                <span className="tiny faint">{e.usageCount > 0 ? t('Dùng trong {n} giáo án', { n: e.usageCount }) : t('Chưa dùng')}{e.hidden && ' · '}{e.hidden && <Badge tone="muted">Đã ẩn</Badge>}</span>
                <div className="row" style={{ gap: 2 }}>
                  <Button size="sm" variant="ghost" icon="eye" aria-label="Xem" onClick={() => setViewingId(e.id)} />
                  {staff && <Button size="sm" variant="ghost" icon="edit" aria-label="Sửa" onClick={() => setEditing(e)} />}
                  {staff && <Button size="sm" variant="ghost" icon={e.hidden ? 'eye' : 'eyeOff'} aria-label={e.hidden ? 'Hiện' : 'Ẩn'} title={e.hidden ? 'Hiện' : 'Ẩn'} onClick={() => void toggleHidden(e)} />}
                  {me.role === 'ADMIN' && e.usageCount === 0 && <Button size="sm" variant="ghost" icon="trash" aria-label="Xoá" onClick={() => setRemoving(e)} />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && <ExerciseDetail exercise={viewing} canReview={me.role === 'ADMIN'} onClose={() => setViewingId(null)} onReviewed={() => void reload()} />}
      {editing && <ExerciseForm exercise={editing === 'new' ? undefined : editing} isAdmin={me.role === 'ADMIN'} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
      {removing && <Confirm danger title="Xoá bài tập?" message={t('"{name}" sẽ bị xoá vĩnh viễn.', { name: removing.name })} confirmText="Xoá" onClose={() => setRemoving(null)}
        onConfirm={async () => { try { await api.del(`/exercises/${removing.id}`); toast.success('Đã xoá'); void reload(); } catch (e) { toast.error(errMsg(e)); throw e; } }} />}
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  return (
    <div>
      <b className="small">{t(title)}</b>
      <div className="small muted mt-8" style={{ whiteSpace: 'pre-line' }}>{text ?? <Missing />}</div>
    </div>
  );
}

function ExerciseDetail({ exercise: e, canReview, onClose, onReviewed }: { exercise: Exercise; canReview: boolean; onClose: () => void; onReviewed: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState(e.reviewNote ?? '');
  const [busy, setBusy] = useState<ReviewStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (status: ReviewStatus) => {
    setError(null);
    if (status === 'NEEDS_REVIEW' && !note.trim()) { setError('Ghi rõ nội dung cần chỉnh sửa trước khi trả về.'); return; }
    setBusy(status);
    try {
      await api.put(`/exercises/${e.id}/review`, { status, note });
      toast.success(status === 'APPROVED' ? 'Đã duyệt bài tập' : 'Đã cập nhật trạng thái duyệt');
      onReviewed();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(null); }
  };

  return (
    <Modal title={e.name} size="wide" onClose={onClose}>
      <div className="stack">
        <div className="row row-wrap">
          <StatusBadge map={reviewLabel} value={e.reviewStatus} />
          <Badge tone="green">{muscleLabel[e.muscleGroup]}</Badge>
          <StatusBadge map={levelLabel} value={e.level} />
          {e.location && <span className="chip">{locationLabel[e.location]}</span>}
          {e.goals.map((g) => <span key={g} className="chip">{goalLabel[g]}</span>)}
        </div>
        <HealthDisclaimer pending={e.reviewStatus !== 'APPROVED'} />
        {e.description ? <p className="muted">{e.description}</p> : <p className="small"><Missing /></p>}

        <div className="info-grid">
          <InfoRow label="Tên tiếng Anh" value={e.nameEn} />
          <InfoRow label="Tên gọi khác" value={e.aliases} />
          <InfoRow label="Dụng cụ" value={e.equipment} />
          <InfoRow label="Cơ phụ trợ" value={e.secondaryMuscles} />
        </div>

        <TextBlock title="Hướng dẫn thực hiện" text={e.instructions} />
        <div className="grid grid-2" style={{ gap: 16 }}>
          <TextBlock title="Hơi thở" text={e.breathing} />
          <TextBlock title="Liều gợi ý" text={e.suggestedDose} />
          <TextBlock title="Lỗi thường gặp" text={e.commonMistakes} />
          <TextBlock title="Biến thể" text={e.variations} />
        </div>
        <TextBlock title="Lưu ý an toàn" text={e.safetyNotes} />
        {e.videoUrl && <a className="btn btn-info" href={e.videoUrl} target="_blank" rel="noreferrer noopener"><Icon name="play" /><span>{t('Xem video hướng dẫn')}</span></a>}

        <div>
          <b className="small">{t('Nguồn tham khảo và giấy phép')}</b>
          <div className="mt-8"><SourceList sources={e.sources} origin={e.contentOrigin} /></div>
        </div>

        <div className="tiny faint">
          {e.reviewedByName ? <>{t('Duyệt gần nhất:')} {e.reviewedByName} · {fmtDateTime(e.reviewedAt)}</> : t('Chưa có lượt duyệt nào')}
          {e.updatedAt && <> · {t('Sửa lần cuối')} {fmtDateTime(e.updatedAt)}</>}
        </div>
        {e.reviewNote && <Alert kind={e.reviewStatus === 'NEEDS_REVIEW' ? 'warning' : 'info'}>{t('Ghi chú duyệt:')} {e.reviewNote}</Alert>}

        {canReview && (
          <Card title="Duyệt nội dung" icon="shield">
            <div className="stack-sm">
              {error && <Alert kind="error">{error}</Alert>}
              <p className="tiny muted">{t('Đối chiếu nội dung với trang nguồn trước khi duyệt. Duyệt nghĩa là quản lý phòng tập chấp nhận hiển thị cho hội viên, không phải chuyên gia y tế xác minh.')}</p>
              <Field label="Ghi chú (bắt buộc khi trả về chỉnh sửa)">
                <Textarea maxLength={500} rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} />
              </Field>
              <div className="row row-wrap">
                <Button variant="primary" icon="check" loading={busy === 'APPROVED'} disabled={e.reviewStatus === 'APPROVED'} onClick={() => void decide('APPROVED')}>Duyệt</Button>
                <Button icon="edit" loading={busy === 'NEEDS_REVIEW'} onClick={() => void decide('NEEDS_REVIEW')}>Trả về chỉnh sửa</Button>
                {e.reviewStatus !== 'PENDING' && <Button variant="ghost" icon="refresh" loading={busy === 'PENDING'} onClick={() => void decide('PENDING')}>Đưa về chờ duyệt</Button>}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}

function ExerciseForm({ exercise, isAdmin, onClose, onSaved }: { exercise?: Exercise; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const sources = useAsync(() => api.get<Source[]>('/content-sources'), []);
  const [f, setF] = useState({
    name: exercise?.name ?? '', nameEn: exercise?.nameEn ?? '', aliases: exercise?.aliases ?? '',
    muscleGroup: exercise?.muscleGroup ?? ('CHEST' as MuscleGroup), secondaryMuscles: exercise?.secondaryMuscles ?? '',
    equipment: exercise?.equipment ?? '', level: exercise?.level ?? ('BEGINNER' as Level),
    location: (exercise?.location ?? '') as ExerciseLocation | '', goals: exercise?.goals ?? ([] as ExerciseGoal[]),
    description: exercise?.description ?? '', instructions: exercise?.instructions ?? '', breathing: exercise?.breathing ?? '',
    commonMistakes: exercise?.commonMistakes ?? '', safetyNotes: exercise?.safetyNotes ?? '', variations: exercise?.variations ?? '',
    suggestedDose: exercise?.suggestedDose ?? '', videoUrl: exercise?.videoUrl ?? '',
    contentOrigin: exercise?.contentOrigin ?? ('SELF_AUTHORED' as ContentOrigin), sourceIds: exercise?.sources.map((s) => s.id) ?? ([] as number[]),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async () => {
    const v: Record<string, string> = {};
    if (!f.name.trim()) v.name = 'Nhập tên bài tập';
    if (f.videoUrl && !/^https?:\/\/.+/.test(f.videoUrl)) v.videoUrl = 'Link phải bắt đầu bằng http(s)://';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const body = { ...f, location: f.location || null };
      if (exercise) await api.put(`/exercises/${exercise.id}`, body); else await api.post('/exercises', body);
      toast.success(exercise ? 'Đã lưu bài tập' : 'Đã thêm bài tập – đang chờ duyệt');
      onSaved();
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title={exercise ? 'Sửa bài tập' : 'Thêm bài tập'} size="wide" onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {!isAdmin && exercise?.reviewStatus === 'APPROVED' && <Alert kind="info">Sau khi lưu, bài sẽ quay về trạng thái "Chờ duyệt".</Alert>}
        <div className="form-grid">
          <Field label="Tên bài tập" error={errors.name} required><Input maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Tên tiếng Anh"><Input maxLength={120} value={f.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></Field>
          <Field label="Tên gọi khác" hint="Cách nhau bởi dấu phẩy" className="span-2"><Input maxLength={255} value={f.aliases} onChange={(e) => set('aliases', e.target.value)} /></Field>
          <Field label="Nhóm cơ chính" required>
            <Select value={f.muscleGroup} onChange={(e) => set('muscleGroup', e.target.value as MuscleGroup)}>{GROUPS.map((g) => <option key={g} value={g}>{muscleLabel[g]}</option>)}</Select>
          </Field>
          <Field label="Cơ phụ trợ"><Input maxLength={255} value={f.secondaryMuscles} onChange={(e) => set('secondaryMuscles', e.target.value)} /></Field>
          <Field label="Cấp độ" required>
            <Select value={f.level} onChange={(e) => set('level', e.target.value as Level)}>{(Object.keys(levelLabel) as Level[]).map((l) => <option key={l} value={l}>{levelLabel[l][0]}</option>)}</Select>
          </Field>
          <Field label="Nơi tập">
            <Select value={f.location} onChange={(e) => set('location', e.target.value as ExerciseLocation | '')}>
              <option value="">{t('Chưa xác định')}</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{locationLabel[l]}</option>)}
            </Select>
          </Field>
          <Field label="Dụng cụ" className="span-2"><Input maxLength={60} value={f.equipment} onChange={(e) => set('equipment', e.target.value)} placeholder="Thanh đòn, tạ đơn…" /></Field>
          <div className="span-2">
            <span className="tiny muted">{t('Mục tiêu')}</span>
            <div className="chips mt-8">
              {GOALS.map((g) => <button type="button" key={g} className={`chip ${f.goals.includes(g) ? 'on' : ''}`} aria-pressed={f.goals.includes(g)} onClick={() => set('goals', toggle(f.goals, g))}>{goalLabel[g]}</button>)}
            </div>
          </div>
          <Field label="Mô tả" className="span-2"><Textarea maxLength={1000} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Hướng dẫn thực hiện" className="span-2" hint="Mỗi bước một dòng"><Textarea maxLength={2000} rows={5} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} /></Field>
          <Field label="Hơi thở" className="span-2"><Input maxLength={500} value={f.breathing} onChange={(e) => set('breathing', e.target.value)} /></Field>
          <Field label="Lỗi thường gặp"><Textarea maxLength={2000} rows={3} value={f.commonMistakes} onChange={(e) => set('commonMistakes', e.target.value)} /></Field>
          <Field label="Biến thể"><Textarea maxLength={2000} rows={3} value={f.variations} onChange={(e) => set('variations', e.target.value)} /></Field>
          <Field label="Lưu ý an toàn" className="span-2"><Textarea maxLength={2000} rows={3} value={f.safetyNotes} onChange={(e) => set('safetyNotes', e.target.value)} /></Field>
          <Field label="Liều gợi ý" hint="Chỉ ghi khi có nguồn; để trống sẽ hiện “Chưa có dữ liệu”" className="span-2"><Input maxLength={255} value={f.suggestedDose} onChange={(e) => set('suggestedDose', e.target.value)} /></Field>
          <Field label="Link video" error={errors.videoUrl} className="span-2"><Input maxLength={255} value={f.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://…" /></Field>
          <Field label="Nguồn gốc nội dung" className="span-2">
            <Select value={f.contentOrigin} onChange={(e) => set('contentOrigin', e.target.value as ContentOrigin)}>
              <option value="SELF_AUTHORED">{t('Tự biên soạn')}</option>
              <option value="ADAPTED">{t('Biên soạn lại từ nguồn mở')}</option>
            </Select>
          </Field>
          <div className="span-2">
            <span className="tiny muted">{t('Nguồn tham khảo (cần ít nhất 1 nguồn để được duyệt)')}</span>
            {sources.error ? <Alert kind="error">{sources.error}</Alert> : !sources.data ? <LoadingBlock rows={2} /> : (
              <div className="source-pick mt-8">
                {sources.data.map((s) => (
                  <label key={s.id} className="check">
                    <input type="checkbox" checked={f.sourceIds.includes(s.id)} onChange={() => set('sourceIds', toggle(f.sourceIds, s.id))} />
                    <span>{s.title} <span className="tiny faint">· {s.publisher}{!s.licenseVerified && ` · ${t('giấy phép chưa xác minh')}`}</span></span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
