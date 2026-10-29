import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Member, Page, Schedule, ScheduleCreated, ScheduleStatus, Trainer, WorkoutPlanSummary } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { WeekCalendar } from '../../components/WeekCalendar';
import { Alert, Badge, Button, Confirm, ErrorState, Field, Input, Modal, PageHead, Person, Segmented, Select, Stars, StatusBadge, Textarea } from '../../components/ui';
import { addDays, fmtDateTime, fmtTime, fmtWeekday, parseDateTime, scheduleStatus, startOfWeek, toIsoDate, toIsoDateTime } from '../../lib/format';
import { errMsg, fieldErrs, useAsync } from '../../lib/hooks';
import { t } from '../../i18n';

type Filter = 'ALL' | ScheduleStatus;

export default function Schedules() {
  const me = useMe();
  const staff = me.role !== 'MEMBER';
  const [params, setParams] = useSearchParams();
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [filter, setFilter] = useState<Filter>('ALL');
  const [trainerId, setTrainerId] = useState<string>('');
  const [open, setOpen] = useState<Schedule | null>(null);
  const [creating, setCreating] = useState(params.get('new') === '1');

  const trainers = useAsync(() => (me.role === 'ADMIN' ? api.get<Trainer[]>('/trainers') : Promise.resolve([] as Trainer[])), [me.role]);
  const { data, error, loading, reload } = useAsync(
    () => api.get<Schedule[]>('/schedules', { from: toIsoDateTime(week), to: toIsoDateTime(addDays(week, 7)), trainerId: trainerId || undefined }),
    [week.getTime(), trainerId],
  );
  const events = useMemo(() => (data ?? []).filter((e) => filter === 'ALL' || e.status === filter), [data, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { SCHEDULED: 0, COMPLETED: 0, MISSED: 0, CANCELLED: 0 };
    (data ?? []).forEach((e) => { c[e.status]++; });
    return c;
  }, [data]);

  const closeCreate = () => { setCreating(false); if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }); } };
  const label = `${week.getDate()}/${week.getMonth() + 1} – ${addDays(week, 6).getDate()}/${addDays(week, 6).getMonth() + 1}/${addDays(week, 6).getFullYear()}`;

  return (
    <div className="page">
      <PageHead eyebrow={staff ? 'Lịch tập' : 'Lịch của tôi'} title={staff ? 'Lịch tập tuần' : 'Lịch tập của tôi'}
        desc={staff ? 'Xếp lịch lặp hằng tuần, hệ thống tự chặn trùng giờ HLV và hội viên, chỉ cho xếp khi hội viên còn gói hiệu lực.' : 'Bấm vào buổi tập để xem chi tiết và đánh dấu hoàn thành.'}
        actions={staff && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Xếp lịch</Button>} />

      <div className="toolbar">
        <div className="row">
          <Button icon="chevronLeft" aria-label="Tuần trước" onClick={() => setWeek(addDays(week, -7))} />
          <Button onClick={() => setWeek(startOfWeek(new Date()))}>Tuần này</Button>
          <Button icon="chevronRight" aria-label="Tuần sau" onClick={() => setWeek(addDays(week, 7))} />
          <b className="num" style={{ marginLeft: 6 }}>{label}</b>
        </div>
        <div className="spacer" />
        {me.role === 'ADMIN' && (
          <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} aria-label="Lọc theo HLV">
            <option value="">{t('Tất cả HLV')}</option>
            {trainers.data?.map((tr) => <option key={tr.id} value={tr.id}>{tr.fullName}</option>)}
          </Select>
        )}
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'ALL', label: `${t('Tất cả')} ${data?.length ?? ''}` },
          { value: 'SCHEDULED', label: `${t('Sắp tới')} ${counts.SCHEDULED}` },
          { value: 'COMPLETED', label: `${t('Hoàn thành')} ${counts.COMPLETED}` },
          { value: 'MISSED', label: `${t('Vắng')} ${counts.MISSED}` },
        ]} />
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : (
        <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
          <WeekCalendar weekStart={week} events={events} onSelect={setOpen} showMember={staff} />
        </div>
      )}
      <div className="legend mt-16">
        {(['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'] as ScheduleStatus[]).map((s) => (
          <span key={s}><i style={{ ['--c' as string]: { SCHEDULED: '#3d97ff', COMPLETED: '#00d95b', MISSED: '#ff6b61', CANCELLED: '#5f636c' }[s] }} />{scheduleStatus[s][0]}</span>
        ))}
      </div>

      {open && <SessionModal session={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void reload(); }} />}
      {creating && <ScheduleForm onClose={closeCreate} onSaved={(firstDay) => { closeCreate(); if (firstDay) setWeek(startOfWeek(firstDay)); void reload(); }} />}
    </div>
  );
}

// ================= Chi tiết buổi tập =================
export function SessionModal({ session, onClose, onChanged }: { session: Schedule; onClose: () => void; onChanged: () => void }) {
  const me = useMe();
  const toast = useToast();
  const staff = me.role !== 'MEMBER';
  const [mode, setMode] = useState<'view' | 'complete' | 'edit'>('view');
  const [confirm, setConfirm] = useState<'cancel' | 'missed' | null>(null);
  const started = parseDateTime(session.startTime) <= new Date();
  const canComplete = (session.status === 'SCHEDULED' || session.status === 'MISSED') && started;

  const act = async (path: string, msg: string) => {
    try { await api.put(`/schedules/${session.id}/${path}`); toast.success(msg); onChanged(); }
    catch (e) { toast.error(errMsg(e)); throw e; }
  };

  if (mode === 'complete') return <CompleteForm session={session} onClose={() => setMode('view')} onDone={onChanged} />;
  if (mode === 'edit') return <ScheduleForm edit={session} onClose={() => setMode('view')} onSaved={() => onChanged()} />;

  return (
    <>
      <Modal title={session.title} onClose={onClose} footer={<>
        {staff && session.status === 'SCHEDULED' && <>
          <Button variant="danger" icon="ban" onClick={() => setConfirm('cancel')}>Huỷ buổi</Button>
          {started && <Button icon="x" onClick={() => setConfirm('missed')}>Đánh vắng</Button>}
          {!started && <Button icon="edit" onClick={() => setMode('edit')}>Dời lịch</Button>}
        </>}
        <span className="grow" />
        {canComplete && <Button variant="primary" icon="checkCircle" onClick={() => setMode('complete')}>Hoàn thành buổi</Button>}
      </>}>
        <div className="stack">
          <div className="row between row-wrap">
            <div className="row"><Icon name="calendar" className="ok" /><b style={{ textTransform: 'capitalize' }}>{fmtWeekday(session.startTime)}</b><span className="muted">{fmtTime(session.startTime)}–{fmtTime(session.endTime)}</span></div>
            <StatusBadge map={scheduleStatus} value={session.status} />
          </div>
          <dl className="kv">
            <dt>{t('Hội viên')}</dt><dd><Person name={session.memberName} size="sm" /></dd>
            <dt>{t('Huấn luyện viên')}</dt><dd>{session.trainerName ?? <span className="faint">{t('Tự tập')}</span>}</dd>
            <dt>{t('Giáo án')}</dt><dd>{session.planName ?? <span className="faint">{t('Không gắn')}</span>}</dd>
            {session.note && <><dt>{t('Ghi chú')}</dt><dd>{session.note}</dd></>}
          </dl>
          {!started && session.status === 'SCHEDULED' && <Alert kind="info">Chỉ đánh dấu hoàn thành được khi đã đến giờ tập.</Alert>}
          {session.status === 'MISSED' && canComplete && <Alert kind="warning">Buổi này đang bị đánh vắng. Nếu bạn đã tập, có thể ghi nhận bù trong vòng 7 ngày.</Alert>}
          {session.log && (
            <div className="card" style={{ background: 'var(--rail)' }}>
              <div className="row between"><b className="ok">{t('Đã hoàn thành')}</b><span className="tiny faint">{fmtDateTime(session.log.completedAt)}</span></div>
              <div className="grid grid-3 mt-8 small">
                <div><div className="faint tiny">{t('Thời lượng')}</div><b>{t('{n} phút', { n: session.log.durationMinutes ?? '—' })}</b></div>
                <div><div className="faint tiny">{t('Calo')}</div><b>{session.log.calories ?? '—'} kcal</b></div>
                <div><div className="faint tiny">{t('Cảm nhận')}</div><Stars value={session.log.rating} /></div>
              </div>
              {session.log.note && <p className="small muted mt-8">“{session.log.note}”</p>}
            </div>
          )}
        </div>
      </Modal>
      {confirm === 'cancel' && <Confirm danger title="Huỷ buổi tập?" message="Buổi tập sẽ chuyển sang trạng thái Đã huỷ và không tính vào chuyên cần." confirmText="Huỷ buổi"
        onClose={() => setConfirm(null)} onConfirm={() => act('cancel', 'Đã huỷ buổi tập')} />}
      {confirm === 'missed' && <Confirm title="Đánh vắng buổi này?" message="Hội viên vẫn có thể ghi nhận bù trong 7 ngày nếu thực tế có tập." confirmText="Đánh vắng"
        onClose={() => setConfirm(null)} onConfirm={() => act('missed', 'Đã đánh vắng')} />}
    </>
  );
}

function CompleteForm({ session, onClose, onDone }: { session: Schedule; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const planned = Math.round((parseDateTime(session.endTime).getTime() - parseDateTime(session.startTime).getTime()) / 60000);
  const [duration, setDuration] = useState(String(planned));
  const [calories, setCalories] = useState('');
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v: Record<string, string> = {};
    const d = Number(duration); const c = calories === '' ? null : Number(calories);
    if (!Number.isInteger(d) || d < 1 || d > 600) v.durationMinutes = 'Từ 1 đến 600 phút';
    if (c != null && (!Number.isInteger(c) || c < 0 || c > 5000)) v.calories = 'Từ 0 đến 5000 kcal';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await api.post(`/schedules/${session.id}/complete`, { durationMinutes: d, calories: c, rating, note: note || null });
      toast.success('Tuyệt vời! Đã ghi nhận buổi tập 💪');
      onDone();
    } catch (e) { toast.error(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title="Hoàn thành buổi tập" onClose={onClose} size="narrow" footer={<>
      <Button variant="ghost" onClick={onClose}>Quay lại</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu kết quả</Button>
    </>}>
      <div className="stack">
        <div className="muted small">{session.title} · {fmtTime(session.startTime)}–{fmtTime(session.endTime)}</div>
        <div className="form-grid">
          <Field label="Thời lượng (phút)" error={errors.durationMinutes} required><Input type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <Field label="Calo tiêu thụ (kcal)" error={errors.calories} hint="Xem trên đồng hồ / máy tập"><Input type="number" min={0} max={5000} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="VD: 420" /></Field>
        </div>
        <Field label="Cảm nhận buổi tập">
          <div className="row" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="btn btn-ghost btn-icon" aria-label={t('{n}/5 sao', { n })} onClick={() => setRating(n)} style={{ color: n <= rating ? 'var(--warning)' : 'var(--faint)' }}>
                <Icon name="star" fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
            <span className="small muted">{t(['', 'Rất mệt', 'Hơi đuối', 'Ổn', 'Tốt', 'Xuất sắc'][rating])}</span>
          </div>
        </Field>
        <Field label="Ghi chú" error={errors.note}><Textarea maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: tăng 2.5kg bench press" /></Field>
      </div>
    </Modal>
  );
}

// ================= Form xếp / dời lịch =================
export function ScheduleForm({ edit, presetMemberId, onClose, onSaved }: { edit?: Schedule; presetMemberId?: number; onClose: () => void; onSaved: (firstDay?: Date) => void }) {
  const me = useMe();
  const toast = useToast();
  const start0 = edit ? parseDateTime(edit.startTime) : (() => { const d = addDays(new Date(), 1); d.setHours(18, 0, 0, 0); return d; })();
  const [memberId, setMemberId] = useState<string>(edit ? String(edit.memberId) : presetMemberId ? String(presetMemberId) : '');
  const [trainerId, setTrainerId] = useState<string>(edit?.trainerId ? String(edit.trainerId) : '');
  const [planId, setPlanId] = useState<string>(edit?.planId ? String(edit.planId) : '');
  const [title, setTitle] = useState(edit?.title ?? 'Buổi tập với HLV');
  const [date, setDate] = useState(toIsoDate(start0));
  const [time, setTime] = useState(`${String(start0.getHours()).padStart(2, '0')}:${String(start0.getMinutes()).padStart(2, '0')}`);
  const [duration, setDuration] = useState(edit ? String(Math.round((parseDateTime(edit.endTime).getTime() - start0.getTime()) / 60000)) : '60');
  const [repeat, setRepeat] = useState('0');
  const [note, setNote] = useState(edit?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const members = useAsync(() => (edit ? Promise.resolve(null) : api.get<Page<Member>>('/members', { size: 200, status: 'ACTIVE' })), []);
  const trainers = useAsync(() => (me.role === 'ADMIN' ? api.get<Trainer[]>('/trainers') : Promise.resolve([] as Trainer[])), []);
  const plans = useAsync(() => (memberId ? api.get<WorkoutPlanSummary[]>('/workout-plans', { memberId }) : Promise.resolve([] as WorkoutPlanSummary[])), [memberId]);
  const selected = members.data?.content.find((m) => String(m.id) === memberId);

  useEffect(() => {
    // Mặc định gắn giáo án đang áp dụng và HLV phụ trách của hội viên.
    if (edit) return;
    const active = plans.data?.find((p) => p.status === 'ACTIVE');
    if (active) { setPlanId(String(active.id)); setTitle(`Buổi tập – ${active.name}`.slice(0, 120)); }
    if (selected?.trainerId && me.role === 'ADMIN') setTrainerId(String(selected.trainerId));
  }, [plans.data, selected?.trainerId, edit, me.role]);

  const submit = async () => {
    const v: Record<string, string> = {};
    if (!memberId) v.memberId = 'Chọn hội viên';
    if (!title.trim()) v.title = 'Nhập tiêu đề';
    const d = Number(duration);
    if (!Number.isInteger(d) || d < 15 || d > 240) v.duration = 'Từ 15 đến 240 phút';
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) v.date = 'Ngày giờ không hợp lệ';
    else if (start < new Date()) v.date = 'Không xếp vào thời điểm đã qua';
    const end = new Date(start.getTime() + d * 60000);
    if (!v.duration && end.getDate() !== start.getDate()) v.duration = 'Buổi tập phải kết thúc trong ngày';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    const body = {
      trainerId: trainerId ? Number(trainerId) : null, planId: planId ? Number(planId) : null, title: title.trim(),
      startTime: toIsoDateTime(start), endTime: toIsoDateTime(end), note: note.trim() || null,
    };
    try {
      if (edit) {
        await api.put(`/schedules/${edit.id}`, body);
        toast.success('Đã dời lịch');
        onSaved(start);
      } else {
        const res = await api.post<ScheduleCreated>('/schedules', { ...body, memberId: Number(memberId), repeatWeeks: Number(repeat) });
        toast.success(t('Đã xếp {n} buổi tập', { n: res.created.length }));
        if (res.skipped.length) { setSkipped(res.skipped); setBusy(false); return; }
        onSaved(start);
      }
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); }
    setBusy(false);
  };

  if (skipped) {
    return (
      <Modal title="Đã xếp lịch, có tuần bị bỏ qua" onClose={() => onSaved(new Date(`${date}T${time}:00`))} footer={<Button variant="primary" onClick={() => onSaved(new Date(`${date}T${time}:00`))}>Đã hiểu</Button>}>
        <Alert kind="warning">Các tuần sau không xếp được nên hệ thống bỏ qua, các tuần còn lại vẫn được tạo:</Alert>
        <ul className="small muted mt-16">{skipped.map((s) => <li key={s}>{s}</li>)}</ul>
      </Modal>
    );
  }

  return (
    <Modal title={edit ? 'Dời lịch buổi tập' : 'Xếp lịch tập'} onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>{edit ? 'Lưu thay đổi' : 'Xếp lịch'}</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          {edit ? (
            <Field label="Hội viên" className="span-2"><Person name={edit.memberName} size="sm" /></Field>
          ) : (
            <Field label="Hội viên" error={errors.memberId} required className="span-2">
              <Select value={memberId} invalid={!!errors.memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">{t('— Chọn hội viên —')}</option>
                {members.data?.content.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} · {m.code}{m.subscriptionState === 'EXPIRED' || !m.subscriptionState ? t(' (không có gói)') : ''}</option>
                ))}
              </Select>
            </Field>
          )}
          {selected && (selected.subscriptionState === 'EXPIRED' || !selected.subscriptionState) && (
            <div className="span-2"><Alert kind="warning">Hội viên này không có gói hiệu lực, hệ thống sẽ từ chối xếp lịch.</Alert></div>
          )}
          {me.role === 'ADMIN' && (
            <Field label="Huấn luyện viên" hint="Để trống = HLV phụ trách của hội viên">
              <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
                <option value="">{t('Mặc định')}</option>
                {trainers.data?.filter((tr) => tr.active).map((tr) => <option key={tr.id} value={tr.id}>{tr.fullName}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Giáo án" className={me.role === 'ADMIN' ? '' : 'span-2'}>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">{t('Không gắn giáo án')}</option>
              {(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== 'ACTIVE' ? t(' (lưu trữ)') : ''}</option>)}
            </Select>
          </Field>
          <Field label="Tiêu đề" error={errors.title} required className="span-2"><Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Ngày" error={errors.date} required><Input type="date" value={date} min={toIsoDate(new Date())} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Giờ bắt đầu" required><Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label="Thời lượng (phút)" error={errors.duration} required>
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{t('{n} phút', { n: m })}</option>)}
              {![30, 45, 60, 75, 90, 120].includes(Number(duration)) && <option value={duration}>{t('{n} phút', { n: duration })}</option>}
            </Select>
          </Field>
          {!edit && (
            <Field label="Lặp lại hằng tuần" hint="Tuần nào trùng giờ / hết gói sẽ được bỏ qua">
              <Select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                <option value="0">{t('Không lặp')}</option>
                {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{t('Thêm {n} tuần ({m} buổi)', { n, m: n + 1 })}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Ghi chú" className="span-2"><Textarea maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: tập trung kỹ thuật squat" /></Field>
        </div>
        {!edit && Number(repeat) > 0 && <Badge tone="blue">{t('Sẽ tạo tối đa {n} buổi vào {day} hằng tuần', { n: Number(repeat) + 1, day: fmtWeekday(`${date}T${time}:00`).split(',')[0] })}</Badge>}
      </div>
    </Modal>
  );
}
