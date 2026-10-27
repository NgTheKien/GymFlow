import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Exercise, Member, MuscleGroup, Page, PlanItem, PlanStatus, WorkoutPlan } from '../../api/types';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { Alert, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, PageHead, Select, StatusBadge, Textarea } from '../../components/ui';
import { addDays, DAYS, DAY_NAMES, muscleColor, muscleLabel, planStatus, toIsoDate } from '../../lib/format';
import { errMsg, useAsync } from '../../lib/hooks';

type Draft = PlanItem & { key: number };
let keySeq = 1;

export default function PlanEditor() {
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const plan = useAsync(() => (isNew ? Promise.resolve(null) : api.get<WorkoutPlan>(`/workout-plans/${id}`)), [id]);
  const members = useAsync(() => api.get<Page<Member>>('/members', { size: 200 }), []);
  const library = useAsync(() => api.get<Exercise[]>('/exercises'), []);

  const [memberId, setMemberId] = useState(params.get('memberId') ?? '');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [start, setStart] = useState(toIsoDate(new Date()));
  const [end, setEnd] = useState(toIsoDate(addDays(new Date(), 55)));
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Draft[]>([]);
  const [day, setDay] = useState(1);
  const [pick, setPick] = useState('');
  const [groupFilter, setGroupFilter] = useState<'' | MuscleGroup>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const p = plan.data;
    if (!p) return;
    setMemberId(String(p.summary.memberId)); setName(p.summary.name); setGoal(p.summary.goal ?? '');
    setStart(p.summary.startDate); setEnd(p.summary.endDate); setNote(p.note ?? '');
    setItems(p.items.map((i) => ({ ...i, key: keySeq++ })));
    setDay(p.items[0]?.dayOfWeek ?? 1);
  }, [plan.data]);

  useEffect(() => {
    // Gợi ý mục tiêu từ hồ sơ hội viên khi tạo mới.
    if (!isNew || goal) return;
    const m = members.data?.content.find((x) => String(x.id) === memberId);
    if (m?.goal) setGoal(m.goal);
  }, [memberId, members.data, isNew, goal]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const dayItems = items.filter((i) => i.dayOfWeek === day);
  const visibleLib = useMemo(() => (library.data ?? []).filter((e) => !groupFilter || e.muscleGroup === groupFilter), [library.data, groupFilter]);
  const touch = () => setDirty(true);

  const add = (exId: number) => {
    const ex = library.data?.find((e) => e.id === exId);
    if (!ex) return;
    const cardio = ex.muscleGroup === 'CARDIO';
    setItems((xs) => [...xs, {
      key: keySeq++, exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment,
      dayOfWeek: day, sortOrder: xs.filter((x) => x.dayOfWeek === day).length, sets: cardio ? 1 : 3, reps: cardio ? '1' : '10-12',
      weightKg: null, restSeconds: cardio ? null : 60, durationMinutes: cardio ? 15 : null, note: null,
    }]);
    setPick(''); touch();
  };
  const update = (key: number, patch: Partial<PlanItem>) => { setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x))); touch(); };
  const remove = (key: number) => { setItems((xs) => xs.filter((x) => x.key !== key)); touch(); };
  const move = (key: number, dir: -1 | 1) => {
    const list = dayItems.map((x) => x.key);
    const i = list.indexOf(key); const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setItems((xs) => xs.map((x) => (x.dayOfWeek === day ? { ...x, sortOrder: list.indexOf(x.key) } : x)));
    touch();
  };
  const copyDay = (to: number) => {
    if (to === day) return;
    setItems((xs) => [...xs.filter((x) => x.dayOfWeek !== to), ...xs.filter((x) => x.dayOfWeek === day).map((x) => ({ ...x, id: undefined, key: keySeq++, dayOfWeek: to }))]);
    toast.info(`Đã chép ${DAY_NAMES[day - 1]} sang ${DAY_NAMES[to - 1]}`); touch();
  };

  const save = async () => {
    setError(null);
    if (!memberId) return setError('Chọn hội viên');
    if (!name.trim()) return setError('Nhập tên giáo án');
    if (end < start) return setError('Ngày kết thúc phải sau ngày bắt đầu');
    if (items.length === 0) return setError('Thêm ít nhất một bài tập');
    const bad = items.find((i) => !i.reps.trim() || i.sets < 1 || i.sets > 20);
    if (bad) { setDay(bad.dayOfWeek); return setError(`Bài "${bad.exerciseName}" (${DAY_NAMES[bad.dayOfWeek - 1]}): số hiệp 1–20 và phải có số lần`); }
    setBusy(true);
    const body = {
      memberId: Number(memberId), name: name.trim(), goal: goal || null, startDate: start, endDate: end, note: note || null,
      items: [...items].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.sortOrder - b.sortOrder).map((i) => ({
        exerciseId: i.exerciseId, dayOfWeek: i.dayOfWeek, sortOrder: i.sortOrder, sets: i.sets, reps: i.reps.trim(),
        weightKg: i.weightKg, restSeconds: i.restSeconds, durationMinutes: i.durationMinutes, note: i.note || null,
      })),
    };
    try {
      const res = isNew ? await api.post<WorkoutPlan>('/workout-plans', body) : await api.put<WorkoutPlan>(`/workout-plans/${id}`, body);
      setDirty(false);
      toast.success(isNew ? 'Đã tạo giáo án, giáo án cũ của hội viên chuyển sang lưu trữ' : 'Đã lưu giáo án');
      if (isNew) navigate(`/workout-plans/${res.summary.id}`, { replace: true }); else void plan.reload();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const setStatus = async (s: PlanStatus) => {
    try { await api.put(`/workout-plans/${id}/status`, { status: s }); toast.success('Đã cập nhật trạng thái'); void plan.reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (plan.error) return <div className="page"><ErrorState message={plan.error} onRetry={plan.reload} /></div>;
  if (!isNew && (plan.loading || !plan.data)) return <div className="page"><LoadingBlock rows={8} /></div>;
  const summary = plan.data?.summary;

  return (
    <div className="page">
      <Link to="/workout-plans" className="link small row" style={{ gap: 6, marginBottom: 14 }}><Icon name="arrowLeft" size={15} />Danh sách giáo án</Link>
      <PageHead eyebrow={isNew ? 'Giáo án mới' : `Giáo án #${id}`} title={isNew ? 'Soạn giáo án' : name || 'Giáo án'}
        desc={summary ? <span className="row" style={{ gap: 8 }}><StatusBadge map={planStatus} value={summary.status} /> HLV {summary.trainerName ?? '—'} · {summary.memberName}</span> : 'Chọn bài theo từng ngày trong tuần, đặt số hiệp, số lần, mức tạ và thời gian nghỉ.'}
        actions={<>
          {!isNew && <Button variant="ghost" icon="trash" onClick={() => setRemoving(true)}>Xoá</Button>}
          {summary && summary.status !== 'ACTIVE' && <Button icon="play" onClick={() => void setStatus('ACTIVE')}>Áp dụng lại</Button>}
          {summary && summary.status === 'ACTIVE' && <Button icon="checkCircle" onClick={() => void setStatus('COMPLETED')}>Đánh dấu hoàn thành</Button>}
          <Button variant="primary" icon="check" loading={busy} onClick={save}>{isNew ? 'Tạo giáo án' : 'Lưu thay đổi'}</Button>
        </>} />
      {error && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}

      <div className="grid grid-main" style={{ alignItems: 'start' }}>
        <Card title="Bài tập theo ngày" icon="calendar">
          <div className="days-tabs">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const n = items.filter((i) => i.dayOfWeek === d).length;
              return <button key={d} className={`${d === day ? 'on' : ''} ${n ? 'has' : ''}`} onClick={() => setDay(d)}>{DAYS[d - 1]}<small>{n ? `${n} bài` : 'Nghỉ'}</small></button>;
            })}
          </div>
          <div className="row between mt-16 row-wrap">
            <b>{DAY_NAMES[day - 1]}</b>
            {dayItems.length > 0 && (
              <Select style={{ width: 'auto', height: 32 }} value="" onChange={(e) => { if (e.target.value) copyDay(Number(e.target.value)); }} aria-label="Chép sang ngày khác">
                <option value="">Chép ngày này sang…</option>
                {[1, 2, 3, 4, 5, 6, 7].filter((d) => d !== day).map((d) => <option key={d} value={d}>{DAY_NAMES[d - 1]}</option>)}
              </Select>
            )}
          </div>
          <div className="stack-sm mt-16">
            {dayItems.length === 0 && <Empty icon="dumbbell" title="Ngày nghỉ" desc="Chọn bài ở khung bên phải để thêm vào ngày này." />}
            {dayItems.length > 0 && (
              <div className="item-row tiny faint" style={{ background: 'none', animation: 'none' }}>
                <span>#</span><span>Bài tập</span><span>Hiệp</span><span>Số lần</span><span className="hide-sm">Tạ (kg)</span><span className="hide-sm">Nghỉ (s)</span><span />
              </div>
            )}
            {[...dayItems].sort((a, b) => a.sortOrder - b.sortOrder).map((it, idx, arr) => (
              <div key={it.key} className="item-row">
                <span className="idx">{idx + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <i style={{ width: 8, height: 8, borderRadius: 2, background: it.muscleGroup ? muscleColor[it.muscleGroup] : 'var(--faint)', flex: 'none' }} />
                    <b className="ellipsis small">{it.exerciseName}</b>
                  </div>
                  <input className="input" style={{ height: 28, marginTop: 4, fontSize: 12 }} maxLength={255} placeholder="Ghi chú…" value={it.note ?? ''} onChange={(e) => update(it.key, { note: e.target.value })} />
                </div>
                <input className="input" type="number" min={1} max={20} value={it.sets} onChange={(e) => update(it.key, { sets: Number(e.target.value) })} aria-label="Số hiệp" />
                <input className="input" maxLength={20} value={it.durationMinutes ? `${it.durationMinutes}'` : it.reps}
                  onChange={(e) => { const v = e.target.value; if (v.endsWith("'")) update(it.key, { durationMinutes: Number(v.slice(0, -1)) || null }); else update(it.key, { reps: v, durationMinutes: null }); }}
                  aria-label="Số lần" title="Nhập 10-12, 45s, hoặc 15' cho số phút" />
                <input className="input hide-sm" type="number" min={0} step={0.5} value={it.weightKg ?? ''} onChange={(e) => update(it.key, { weightKg: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Mức tạ" />
                <input className="input hide-sm" type="number" min={0} max={900} step={15} value={it.restSeconds ?? ''} onChange={(e) => update(it.key, { restSeconds: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Nghỉ" />
                <div className="stack-sm" style={{ gap: 2 }}>
                  <Button size="sm" variant="ghost" icon="chevronDown" style={{ transform: 'rotate(180deg)' }} aria-label="Lên" disabled={idx === 0} onClick={() => move(it.key, -1)} />
                  <Button size="sm" variant="ghost" icon="x" aria-label="Bỏ bài" onClick={() => remove(it.key)} />
                  <Button size="sm" variant="ghost" icon="chevronDown" aria-label="Xuống" disabled={idx === arr.length - 1} onClick={() => move(it.key, 1)} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="stack" style={{ gap: 18 }}>
          <Card title="Thông tin" icon="clipboard">
            <div className="stack">
              <Field label="Hội viên" required>
                <Select value={memberId} disabled={!isNew} onChange={(e) => { setMemberId(e.target.value); touch(); }}>
                  <option value="">— Chọn hội viên —</option>
                  {members.data?.content.map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.code}</option>)}
                </Select>
              </Field>
              <Field label="Tên giáo án" required><Input maxLength={120} value={name} onChange={(e) => { setName(e.target.value); touch(); }} placeholder="VD: Full body 3 buổi/tuần" /></Field>
              <Field label="Mục tiêu"><Input maxLength={255} value={goal} onChange={(e) => { setGoal(e.target.value); touch(); }} /></Field>
              <div className="form-grid">
                <Field label="Bắt đầu" required><Input type="date" value={start} onChange={(e) => { setStart(e.target.value); touch(); }} /></Field>
                <Field label="Kết thúc" required><Input type="date" value={end} min={start} onChange={(e) => { setEnd(e.target.value); touch(); }} /></Field>
              </div>
              <Field label="Ghi chú chung"><Textarea maxLength={1000} value={note} onChange={(e) => { setNote(e.target.value); touch(); }} placeholder="Khởi động, dinh dưỡng, lưu ý chấn thương…" /></Field>
            </div>
          </Card>
          <Card title={`Thêm bài vào ${DAYS[day - 1]}`} icon="plus">
            <div className="stack">
              <div className="chips">
                <button className={`chip ${groupFilter === '' ? 'on' : ''}`} onClick={() => setGroupFilter('')}>Tất cả</button>
                {(Object.keys(muscleLabel) as MuscleGroup[]).map((g) => <button key={g} className={`chip ${groupFilter === g ? 'on' : ''}`} onClick={() => setGroupFilter(g)}>{muscleLabel[g]}</button>)}
              </div>
              <div className="row">
                <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Chọn bài tập">
                  <option value="">— Chọn bài tập ({visibleLib.length}) —</option>
                  {visibleLib.map((e) => <option key={e.id} value={e.id}>{e.name} · {muscleLabel[e.muscleGroup]}</option>)}
                </Select>
                <Button variant="primary" icon="plus" disabled={!pick} onClick={() => add(Number(pick))} aria-label="Thêm" />
              </div>
              <div className="tiny faint">Mẹo: ô “Số lần” nhận 10-12, 8, 45s; nhập 15' để đặt theo phút (cardio).</div>
            </div>
          </Card>
        </div>
      </div>

      {removing && <Confirm danger title="Xoá giáo án?" message="Các buổi tập đã gắn giáo án này vẫn được giữ lại, chỉ bỏ liên kết." confirmText="Xoá" onClose={() => setRemoving(false)}
        onConfirm={async () => { try { await api.del(`/workout-plans/${id}`); toast.success('Đã xoá giáo án'); setDirty(false); navigate('/workout-plans'); } catch (e) { toast.error(errMsg(e)); throw e; } }} />}
    </div>
  );
}
