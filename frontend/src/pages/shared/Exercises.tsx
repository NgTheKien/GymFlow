import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Exercise, Level, MuscleGroup } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, SearchInput, Select, StatusBadge, Textarea } from '../../components/ui';
import { levelLabel, muscleColor, muscleLabel } from '../../lib/format';
import { errMsg, fieldErrs, useAsync, useDebounced } from '../../lib/hooks';

const GROUPS = Object.keys(muscleLabel) as MuscleGroup[];

export default function Exercises() {
  const me = useMe();
  const staff = me.role !== 'MEMBER';
  const toast = useToast();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<'' | MuscleGroup>('');
  const [level, setLevel] = useState<'' | Level>('');
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [viewing, setViewing] = useState<Exercise | null>(null);
  const [removing, setRemoving] = useState<Exercise | null>(null);
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useAsync(
    () => api.get<Exercise[]>('/exercises', { q: dq, muscleGroup: group, level, includeHidden: showHidden }), [dq, group, level, showHidden]);
  const counts = useMemo(() => {
    const c: Partial<Record<MuscleGroup, number>> = {};
    data?.forEach((e) => { c[e.muscleGroup] = (c[e.muscleGroup] ?? 0) + 1; });
    return c;
  }, [data]);

  const toggleHidden = async (e: Exercise) => {
    try { await api.put(`/exercises/${e.id}/hidden`, { hidden: !e.hidden }); toast.success(e.hidden ? 'Đã hiện bài tập' : 'Đã ẩn bài tập'); void reload(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="page">
      <PageHead eyebrow="Huấn luyện" title="Thư viện bài tập" desc="Bài tập dùng để soạn giáo án. Bài đã nằm trong giáo án chỉ được ẩn, không xoá để giữ nguyên lịch sử."
        actions={staff && <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Thêm bài tập</Button>} />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm bài tập, dụng cụ…" />
        <Select value={level} onChange={(e) => setLevel(e.target.value as Level | '')} aria-label="Cấp độ">
          <option value="">Mọi cấp độ</option>
          {(Object.keys(levelLabel) as Level[]).map((l) => <option key={l} value={l}>{levelLabel[l][0]}</option>)}
        </Select>
        {staff && <label className="check"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />Hiện cả bài đã ẩn</label>}
      </div>
      <div className="chips" style={{ marginBottom: 18 }}>
        <button className={`chip ${group === '' ? 'on' : ''}`} onClick={() => setGroup('')}>Tất cả</button>
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
                    <div className="tiny muted">{muscleLabel[e.muscleGroup]} · {e.equipment ?? 'Không dụng cụ'}</div>
                  </div>
                </div>
                <StatusBadge map={levelLabel} value={e.level} />
              </div>
              {e.description && <p className="small muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</p>}
              <div className="row between">
                <span className="tiny faint">{e.usageCount > 0 ? `Dùng trong ${e.usageCount} giáo án` : 'Chưa dùng'}{e.hidden && ' · '}{e.hidden && <Badge tone="muted">Đã ẩn</Badge>}</span>
                <div className="row" style={{ gap: 2 }}>
                  <Button size="sm" variant="ghost" icon="eye" aria-label="Xem" onClick={() => setViewing(e)} />
                  {staff && <Button size="sm" variant="ghost" icon="edit" aria-label="Sửa" onClick={() => setEditing(e)} />}
                  {staff && <Button size="sm" variant="ghost" icon={e.hidden ? 'eye' : 'eyeOff'} aria-label={e.hidden ? 'Hiện' : 'Ẩn'} title={e.hidden ? 'Hiện' : 'Ẩn'} onClick={() => void toggleHidden(e)} />}
                  {me.role === 'ADMIN' && e.usageCount === 0 && <Button size="sm" variant="ghost" icon="trash" aria-label="Xoá" onClick={() => setRemoving(e)} />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <div className="stack">
            <div className="row row-wrap"><Badge tone="green">{muscleLabel[viewing.muscleGroup]}</Badge><StatusBadge map={levelLabel} value={viewing.level} /><span className="chip">{viewing.equipment ?? 'Không dụng cụ'}</span></div>
            {viewing.description && <p className="muted">{viewing.description}</p>}
            {viewing.instructions && <div><b>Hướng dẫn</b><div className="small muted mt-8" style={{ whiteSpace: 'pre-line' }}>{viewing.instructions}</div></div>}
            {viewing.videoUrl && <a className="btn btn-info" href={viewing.videoUrl} target="_blank" rel="noreferrer noopener"><Icon name="play" /><span>Xem video hướng dẫn</span></a>}
          </div>
        </Modal>
      )}
      {editing && <ExerciseForm exercise={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
      {removing && <Confirm danger title="Xoá bài tập?" message={`"${removing.name}" sẽ bị xoá vĩnh viễn.`} confirmText="Xoá" onClose={() => setRemoving(null)}
        onConfirm={async () => { try { await api.del(`/exercises/${removing.id}`); toast.success('Đã xoá'); void reload(); } catch (e) { toast.error(errMsg(e)); throw e; } }} />}
    </div>
  );
}

function ExerciseForm({ exercise, onClose, onSaved }: { exercise?: Exercise; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: exercise?.name ?? '', muscleGroup: exercise?.muscleGroup ?? ('CHEST' as MuscleGroup), equipment: exercise?.equipment ?? '',
    level: exercise?.level ?? ('BEGINNER' as Level), description: exercise?.description ?? '', instructions: exercise?.instructions ?? '', videoUrl: exercise?.videoUrl ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    const v: Record<string, string> = {};
    if (!f.name.trim()) v.name = 'Nhập tên bài tập';
    if (f.videoUrl && !/^https?:\/\/.+/.test(f.videoUrl)) v.videoUrl = 'Link phải bắt đầu bằng http(s)://';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      if (exercise) await api.put(`/exercises/${exercise.id}`, f); else await api.post('/exercises', f);
      toast.success(exercise ? 'Đã lưu bài tập' : 'Đã thêm bài tập');
      onSaved();
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title={exercise ? 'Sửa bài tập' : 'Thêm bài tập'} onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          <Field label="Tên bài tập" error={errors.name} required className="span-2"><Input maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Nhóm cơ" required>
            <Select value={f.muscleGroup} onChange={(e) => set('muscleGroup', e.target.value as MuscleGroup)}>{GROUPS.map((g) => <option key={g} value={g}>{muscleLabel[g]}</option>)}</Select>
          </Field>
          <Field label="Cấp độ" required>
            <Select value={f.level} onChange={(e) => set('level', e.target.value as Level)}>{(Object.keys(levelLabel) as Level[]).map((l) => <option key={l} value={l}>{levelLabel[l][0]}</option>)}</Select>
          </Field>
          <Field label="Dụng cụ" className="span-2"><Input maxLength={60} value={f.equipment} onChange={(e) => set('equipment', e.target.value)} placeholder="Thanh đòn, tạ đơn…" /></Field>
          <Field label="Mô tả" className="span-2"><Textarea maxLength={1000} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Hướng dẫn thực hiện" className="span-2" hint="Mỗi bước một dòng"><Textarea maxLength={2000} rows={5} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} /></Field>
          <Field label="Link video" error={errors.videoUrl} className="span-2"><Input maxLength={255} value={f.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/…" /></Field>
        </div>
      </div>
    </Modal>
  );
}
