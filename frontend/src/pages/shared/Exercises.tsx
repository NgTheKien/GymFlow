import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../../api/client';
import type { ContentOrigin, Exercise, ExerciseGoal, ExerciseLocation, Level, MuscleGroup, ReviewStatus, Source } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { HealthDisclaimer, InfoRow, Missing, SourceList } from '../../components/Content';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, Pager, SearchInput, Select, StatusBadge, Textarea } from '../../components/ui';
import { fmtDateTime, goalLabel, levelLabel, locationLabel, muscleColor, muscleLabel, reviewLabel } from '../../lib/format';
import { errMsg, fieldErrs, useAsync, useDebounced, usePaged } from '../../lib/hooks';
import { t } from '../../i18n';

const GROUPS = Object.keys(muscleLabel) as MuscleGroup[];
const LOCATIONS = Object.keys(locationLabel) as ExerciseLocation[];
const GOALS = Object.keys(goalLabel) as ExerciseGoal[];
const REVIEWS = Object.keys(reviewLabel) as ReviewStatus[];

type Sort = 'name' | 'updated' | 'usage' | 'review';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'name', label: 'Tên A → Z' },
  { value: 'updated', label: 'Mới cập nhật' },
  { value: 'usage', label: 'Dùng nhiều nhất' },
  { value: 'review', label: 'Cần duyệt trước' },
];
// Thứ tự ưu tiên khi sắp "Cần duyệt trước": bài bị trả về → chờ duyệt → bản nháp → đã duyệt
const REVIEW_ORDER: Record<ReviewStatus, number> = { NEEDS_REVIEW: 0, PENDING: 1, DRAFT: 2, APPROVED: 3 };
const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'vi');
const SORTERS: Record<Sort, (a: Exercise, b: Exercise) => number> = {
  name: byName,
  updated: (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || byName(a, b),
  usage: (a, b) => b.usageCount - a.usageCount || byName(a, b),
  review: (a, b) => REVIEW_ORDER[a.reviewStatus] - REVIEW_ORDER[b.reviewStatus] || byName(a, b),
};

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
  const [sort, setSort] = useState<Sort>('name');
  const [editing, setEditing] = useState<{ exercise?: Exercise; copyOf?: Exercise } | null>(null);
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
  const sorted = useMemo(() => [...(data ?? [])].sort(SORTERS[sort]), [data, sort]);
  const paged = usePaged(sorted, 'exercises', `${dq}|${group}|${level}|${location}|${goal}|${review}|${showHidden}|${sort}`, 12);
  const pendingCount = data?.filter((e) => e.reviewStatus !== 'APPROVED').length ?? 0;
  const viewing = data?.find((e) => e.id === viewingId) ?? null;
  const filtered = !!(q || group || level || location || goal || review || showHidden);
  const clearFilters = () => { setQ(''); setGroup(''); setLevel(''); setLocation(''); setGoal(''); setReview(''); setShowHidden(false); };

  const toggleHidden = async (e: Exercise) => {
    try { await api.put(`/exercises/${e.id}/hidden`, { hidden: !e.hidden }); toast.success(e.hidden ? 'Đã hiện bài tập' : 'Đã ẩn bài tập'); void reload(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="page">
      <PageHead eyebrow="Huấn luyện" title="Thư viện bài tập"
        desc="Mỗi bài có nguồn tham khảo, giấy phép và trạng thái duyệt. Bài đã nằm trong giáo án chỉ được ẩn, không xoá để giữ nguyên lịch sử."
        actions={staff && <Button variant="primary" icon="plus" onClick={() => setEditing({})}>Thêm bài tập</Button>} />

      {data && pendingCount > 0 && (
        <Alert kind="warning" action={staff && sort !== 'review' && <Button size="sm" onClick={() => setSort('review')}>Xem bài cần duyệt</Button>}>
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
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sắp xếp">
          {SORTS.filter((s) => staff || s.value !== 'review').map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
        </Select>
        {staff && <label className="check"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />{t('Hiện cả bài đã ẩn')}</label>}
        {filtered && <Button variant="ghost" size="sm" icon="x" onClick={clearFilters}>Xoá bộ lọc</Button>}
      </div>
      <div className="chips" style={{ marginBottom: 18 }}>
        <button className={`chip ${group === '' ? 'on' : ''}`} onClick={() => setGroup('')}>{t('Tất cả')}</button>
        {GROUPS.map((g) => <button key={g} className={`chip ${group === g ? 'on' : ''}`} onClick={() => setGroup(g)}>{muscleLabel[g]}{group === '' && counts[g] ? ` · ${counts[g]}` : ''}</button>)}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <LoadingBlock rows={6} /> : data && data.length === 0 ? (
        <Card><Empty icon="dumbbell" title="Không có bài tập phù hợp" desc={filtered ? 'Thử bỏ bớt bộ lọc hoặc đổi từ khoá.' : undefined}
          action={filtered ? <Button onClick={clearFilters}>Xoá bộ lọc</Button> : undefined} /></Card>
      ) : (
        <>
          <div className="grid grid-3" aria-busy={loading}>
            {paged.items.map((e) => (
              <Card key={e.id} className={`hoverable ex-card ${e.hidden ? 'is-hidden' : ''}`}>
                <div className="top">
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <div className="muscle-ic" style={{ ['--c' as string]: muscleColor[e.muscleGroup] }}><Icon name="dumbbell" /></div>
                    <div>
                      <button type="button" className="ex-title" onClick={() => setViewingId(e.id)}>{e.name}</button>
                      {e.nameEn && <div className="tiny faint">{e.nameEn}</div>}
                      <div className="tiny muted">{muscleLabel[e.muscleGroup]} · {e.equipment ?? t('Không dụng cụ')}{e.location && ` · ${locationLabel[e.location]}`}</div>
                    </div>
                  </div>
                  <StatusBadge map={levelLabel} value={e.level} />
                </div>
                {e.description && <p className="small muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</p>}
                <div className="row row-wrap" style={{ gap: 6 }}>
                  <StatusBadge map={reviewLabel} value={e.reviewStatus} />
                  <span className="tiny faint">{e.sources.length > 0 ? t('{n} nguồn', { n: e.sources.length }) : t('Chưa có nguồn')}</span>
                  {e.updatedAt && <span className="tiny faint">· {t('Sửa lần cuối')} {fmtDateTime(e.updatedAt)}</span>}
                </div>
                <div className="row between">
                  <span className="tiny faint">{e.usageCount > 0 ? t('Dùng trong {n} giáo án', { n: e.usageCount }) : t('Chưa dùng')}{e.hidden && ' · '}{e.hidden && <Badge tone="muted">Đã ẩn</Badge>}</span>
                  <div className="row" style={{ gap: 2 }}>
                    <Button size="sm" variant="ghost" icon="eye" aria-label="Xem" title="Xem" onClick={() => setViewingId(e.id)} />
                    {staff && <Button size="sm" variant="ghost" icon="edit" aria-label="Sửa" title="Sửa" onClick={() => setEditing({ exercise: e })} />}
                    {staff && <Button size="sm" variant="ghost" icon="copy" aria-label="Nhân bản" title="Nhân bản" onClick={() => setEditing({ copyOf: e })} />}
                    {staff && <Button size="sm" variant="ghost" icon={e.hidden ? 'eye' : 'eyeOff'} aria-label={e.hidden ? 'Hiện' : 'Ẩn'} title={e.hidden ? 'Hiện' : 'Ẩn'} onClick={() => void toggleHidden(e)} />}
                    {me.role === 'ADMIN' && e.usageCount === 0 && <Button size="sm" variant="ghost" icon="trash" aria-label="Xoá" title="Xoá" onClick={() => setRemoving(e)} />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card flush className="mt-16">
            <Pager page={paged.page} totalPages={paged.totalPages} total={paged.total} onPage={(p) => { paged.setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              size={paged.size} sizes={[12, 24, 50]} onSize={paged.setSize} />
          </Card>
        </>
      )}

      {viewing && <ExerciseDetail exercise={viewing} canReview={me.role === 'ADMIN'} onClose={() => setViewingId(null)} onReviewed={() => void reload()} />}
      {editing && <ExerciseForm exercise={editing.exercise} copyOf={editing.copyOf} isAdmin={me.role === 'ADMIN'} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); void reload(); }} />}
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


/** Đếm ký tự dưới ô nhập dài; chuyển màu cảnh báo khi còn dưới 10% giới hạn của backend. */
function Count({ value, max }: { value: string; max: number }) {
  return <div className={`char-count ${value.length > max * 0.9 ? 'near' : ''}`} aria-live="polite">{value.length}/{max}</div>;
}

function FormSection({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section-head"><h3>{t(title)}</h3>{desc && <p className="tiny muted">{t(desc)}</p>}</div>
      <div className="form-grid">{children}</div>
    </section>
  );
}

const blank = (s: string) => s.trim();

function ExerciseForm({ exercise, copyOf, isAdmin, onClose, onSaved }: { exercise?: Exercise; copyOf?: Exercise; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const sources = useAsync(() => api.get<Source[]>('/content-sources'), []);
  const base = exercise ?? copyOf;
  const initial = useMemo(() => ({
    name: copyOf ? `${copyOf.name} (bản sao)`.slice(0, 120) : exercise?.name ?? '',
    nameEn: base?.nameEn ?? '', aliases: base?.aliases ?? '',
    muscleGroup: base?.muscleGroup ?? ('CHEST' as MuscleGroup), secondaryMuscles: base?.secondaryMuscles ?? '',
    equipment: base?.equipment ?? '', level: base?.level ?? ('BEGINNER' as Level),
    location: (base?.location ?? '') as ExerciseLocation | '', goals: base?.goals ?? ([] as ExerciseGoal[]),
    description: base?.description ?? '', instructions: base?.instructions ?? '', breathing: base?.breathing ?? '',
    commonMistakes: base?.commonMistakes ?? '', safetyNotes: base?.safetyNotes ?? '', variations: base?.variations ?? '',
    suggestedDose: base?.suggestedDose ?? '', videoUrl: base?.videoUrl ?? '',
    contentOrigin: base?.contentOrigin ?? ('SELF_AUTHORED' as ContentOrigin), sourceIds: base?.sources.map((s) => s.id) ?? ([] as number[]),
  }), [base, copyOf, exercise]);
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [sourceQ, setSourceQ] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  // Bản sao luôn coi là "có thay đổi" vì chưa được lưu
  const dirty = !!copyOf || JSON.stringify(f) !== JSON.stringify(initial);
  // Esc khi hộp xác nhận đang mở sẽ chạm cả hai modal: bỏ qua ở form để hộp xác nhận tự đóng
  const requestClose = () => { if (confirmLeave) return; if (dirty && !busy) setConfirmLeave(true); else onClose(); };

  const shownSources = useMemo(() => {
    const list = sources.data ?? [];
    const k = sourceQ.trim().toLowerCase();
    const match = k ? list.filter((s) => `${s.title} ${s.publisher} ${s.code}`.toLowerCase().includes(k)) : list;
    // Nguồn đang chọn lên đầu để thấy ngay những gì đã gắn
    return [...match].sort((a, b) => Number(f.sourceIds.includes(b.id)) - Number(f.sourceIds.includes(a.id)));
  }, [sources.data, sourceQ, f.sourceIds]);

  const submit = async () => {
    if (busy || !dirty) return;
    const v: Record<string, string> = {};
    if (!f.name.trim()) v.name = 'Nhập tên bài tập';
    if (f.videoUrl.trim() && !/^https?:\/\/.+/.test(f.videoUrl.trim())) v.videoUrl = 'Link phải bắt đầu bằng http(s)://';
    setErrors(v); setError(null);
    if (Object.keys(v).length) {
      // Đưa ô lỗi đầu tiên vào tầm nhìn – form dài, lỗi có thể nằm ngoài màn hình
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('.has-err')?.focus());
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...f, name: blank(f.name), nameEn: blank(f.nameEn), aliases: blank(f.aliases), secondaryMuscles: blank(f.secondaryMuscles),
        equipment: blank(f.equipment), breathing: blank(f.breathing), suggestedDose: blank(f.suggestedDose), videoUrl: blank(f.videoUrl),
        location: f.location || null,
      };
      if (exercise) await api.put(`/exercises/${exercise.id}`, body); else await api.post('/exercises', body);
      toast.success(exercise ? 'Đã lưu bài tập' : 'Đã thêm bài tập – đang chờ duyệt');
      onSaved();
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); bodyRef.current?.scrollIntoView({ block: 'start' }); } finally { setBusy(false); }
  };

  // Ctrl/⌘ + S để lưu nhanh khi đang soạn
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void submitRef.current(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const noSource = f.sourceIds.length === 0;
  const title = exercise ? t('Sửa bài tập: {name}', { name: exercise.name }) : copyOf ? t('Nhân bản bài tập') : t('Thêm bài tập');

  return (
    <>
      <Modal title={title} size="wide" onClose={requestClose} footer={<>
        <span className="tiny faint modal-foot-hint">{dirty ? t('Có thay đổi chưa lưu') : t('Chưa có thay đổi')} · {t('Ctrl/⌘ + S để lưu')}</span>
        <Button variant="ghost" onClick={requestClose}>Huỷ</Button>
        <Button variant="primary" icon="check" loading={busy} disabled={!dirty} onClick={() => void submit()}>{exercise ? 'Lưu thay đổi' : 'Thêm bài tập'}</Button>
      </>}>
        <div className="stack" ref={bodyRef}>
          {error && <Alert kind="error">{error}</Alert>}
          {!isAdmin && exercise?.reviewStatus === 'APPROVED' && <Alert kind="info">Sau khi lưu, bài sẽ quay về trạng thái "Chờ duyệt".</Alert>}
          {exercise?.reviewStatus === 'NEEDS_REVIEW' && exercise.reviewNote && <Alert kind="warning">{t('Quản lý yêu cầu chỉnh sửa:')} {exercise.reviewNote}</Alert>}
          {copyOf && <Alert kind="info">{t('Đang tạo bài mới từ "{name}". Hãy đổi tên – tên bài tập không được trùng.', { name: copyOf.name })}</Alert>}

          <FormSection title="Thông tin cơ bản">
            <Field label="Tên bài tập" error={errors.name} required>
              <Input maxLength={120} value={f.name} invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="VD: Squat thanh đòn sau" />
            </Field>
            <Field label="Tên tiếng Anh"><Input maxLength={120} value={f.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="VD: Back squat" /></Field>
            <Field label="Tên gọi khác" hint="Cách nhau bởi dấu phẩy – giúp tìm kiếm" className="span-2"><Input maxLength={255} value={f.aliases} onChange={(e) => set('aliases', e.target.value)} /></Field>
            <Field label="Mô tả ngắn" className="span-2">
              <Textarea maxLength={1000} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
              <Count value={f.description} max={1000} />
            </Field>
          </FormSection>

          <FormSection title="Phân loại" desc="Dùng cho bộ lọc trong thư viện và khi HLV soạn giáo án.">
            <Field label="Nhóm cơ chính" required>
              <Select value={f.muscleGroup} onChange={(e) => set('muscleGroup', e.target.value as MuscleGroup)}>{GROUPS.map((g) => <option key={g} value={g}>{muscleLabel[g]}</option>)}</Select>
            </Field>
            <Field label="Cơ phụ trợ"><Input maxLength={255} value={f.secondaryMuscles} onChange={(e) => set('secondaryMuscles', e.target.value)} placeholder="VD: Mông, lưng dưới" /></Field>
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
              <span className="tiny muted">{t('Mục tiêu')} · {t('chọn một hoặc nhiều')}</span>
              <div className="chips mt-8" role="group" aria-label={t('Mục tiêu')}>
                {GOALS.map((g) => {
                  const on = f.goals.includes(g);
                  return (
                    <button type="button" key={g} className={`chip chip-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set('goals', toggle(f.goals, g))}>
                      <Icon name={on ? 'check' : 'plus'} size={12} />{goalLabel[g]}
                    </button>
                  );
                })}
              </div>
            </div>
          </FormSection>

          <FormSection title="Hướng dẫn tập">
            <Field label="Hướng dẫn thực hiện" className="span-2" hint="Mỗi bước một dòng, VD: 1. Đứng thẳng…">
              <Textarea maxLength={2000} rows={5} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} />
              <Count value={f.instructions} max={2000} />
            </Field>
            <Field label="Hơi thở" className="span-2"><Input maxLength={500} value={f.breathing} onChange={(e) => set('breathing', e.target.value)} placeholder="VD: Hít vào khi hạ người, thở ra khi đứng lên" /></Field>
            <Field label="Lỗi thường gặp">
              <Textarea maxLength={2000} rows={3} value={f.commonMistakes} onChange={(e) => set('commonMistakes', e.target.value)} />
              <Count value={f.commonMistakes} max={2000} />
            </Field>
            <Field label="Biến thể">
              <Textarea maxLength={2000} rows={3} value={f.variations} onChange={(e) => set('variations', e.target.value)} />
              <Count value={f.variations} max={2000} />
            </Field>
            <Field label="Link video" error={errors.videoUrl} className="span-2">
              <Input maxLength={255} value={f.videoUrl} invalid={!!errors.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://…" />
            </Field>
          </FormSection>

          <FormSection title="An toàn và liều tập">
            <Field label="Lưu ý an toàn" className="span-2">
              <Textarea maxLength={2000} rows={3} value={f.safetyNotes} onChange={(e) => set('safetyNotes', e.target.value)} />
              <Count value={f.safetyNotes} max={2000} />
            </Field>
            <Field label="Liều gợi ý" hint="Chỉ ghi khi có nguồn; để trống sẽ hiện “Chưa có dữ liệu”" className="span-2"><Input maxLength={255} value={f.suggestedDose} onChange={(e) => set('suggestedDose', e.target.value)} /></Field>
          </FormSection>

          <FormSection title="Nguồn và giấy phép">
            <Field label="Nguồn gốc nội dung" className="span-2">
              <Select value={f.contentOrigin} onChange={(e) => set('contentOrigin', e.target.value as ContentOrigin)}>
                <option value="SELF_AUTHORED">{t('Tự biên soạn')}</option>
                <option value="ADAPTED">{t('Biên soạn lại từ nguồn mở')}</option>
              </Select>
            </Field>
            <div className="span-2">
              <div className="row between row-wrap" style={{ gap: 8 }}>
                <span className="tiny muted">{t('Nguồn tham khảo (cần ít nhất 1 nguồn để được duyệt)')} · <b>{t('đã chọn {n}', { n: f.sourceIds.length })}</b></span>
                {(sources.data?.length ?? 0) > 6 && <div style={{ minWidth: 220 }}><SearchInput value={sourceQ} onChange={setSourceQ} placeholder="Tìm nguồn…" /></div>}
              </div>
              {noSource && <div className="mt-8"><Alert kind="warning">{t('Chưa gắn nguồn nào – bài sẽ không thể được duyệt.')}</Alert></div>}
              {sources.error ? <Alert kind="error">{sources.error}</Alert> : !sources.data ? <LoadingBlock rows={2} /> : shownSources.length === 0 ? (
                <p className="tiny faint mt-8">{t('Không có nguồn phù hợp')}</p>
              ) : (
                <div className="source-pick mt-8">
                  {shownSources.map((s) => (
                    <label key={s.id} className="check">
                      <input type="checkbox" checked={f.sourceIds.includes(s.id)} onChange={() => set('sourceIds', toggle(f.sourceIds, s.id))} />
                      <span>{s.title} <span className="tiny faint">· {s.publisher}{!s.licenseVerified && ` · ${t('giấy phép chưa xác minh')}`}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </Modal>
      {confirmLeave && <Confirm title="Bỏ thay đổi?" message={t('Các thay đổi chưa lưu sẽ bị mất.')} confirmText="Bỏ thay đổi" danger
        onClose={() => setConfirmLeave(false)} onConfirm={() => { setConfirmLeave(false); onClose(); }} />}
    </>
  );
}
