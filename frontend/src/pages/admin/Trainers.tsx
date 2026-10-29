import { useState } from 'react';
import { api } from '../../api/client';
import type { Trainer, TrainerCreated } from '../../api/types';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, PasswordInput, Person, Textarea } from '../../components/ui';
import { DAYS } from '../../lib/format';
import { errMsg, fieldErrs, useAsync } from '../../lib/hooks';
import { ShiftEditor } from '../shared/Profile';
import { t, tn } from '../../i18n';

export default function Trainers() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get<Trainer[]>('/trainers'), []);
  const [editing, setEditing] = useState<Trainer | 'new' | null>(null);
  const [shifts, setShifts] = useState<Trainer | null>(null);
  const [toggling, setToggling] = useState<Trainer | null>(null);
  const [created, setCreated] = useState<TrainerCreated | null>(null);

  return (
    <div className="page">
      <PageHead eyebrow="Kinh doanh" title="Huấn luyện viên" desc="Hồ sơ chuyên môn, ca làm việc và số hội viên đang phụ trách."
        actions={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Thêm HLV</Button>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <LoadingBlock rows={6} /> : data.length === 0 ? <Card><Empty icon="badge" title="Chưa có HLV" /></Card> : (
        <div className="grid grid-3">
          {data.map((tr) => {
            const hours = tr.shifts.reduce((a, s) => a + (Number(s.endTime.slice(0, 2)) * 60 + Number(s.endTime.slice(3, 5)) - Number(s.startTime.slice(0, 2)) * 60 - Number(s.startTime.slice(3, 5))) / 60, 0);
            const days = new Set(tr.shifts.map((s) => s.dayOfWeek));
            return (
              <Card key={tr.id} className="hoverable">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <Person name={tr.fullName} sub={tr.email} />
                  {tr.active ? <Badge tone="green">Đang nhận HV</Badge> : <Badge tone="muted">Tạm ngừng</Badge>}
                </div>
                <div className="stack-sm mt-16 small">
                  <div className="row"><Icon name="target" size={15} className="ok" />{tr.specialty ?? t('Chưa cập nhật chuyên môn')}</div>
                  <div className="row"><Icon name="trophy" size={15} className="ok" />{t('{n} năm kinh nghiệm', { n: tr.experienceYears })}{tr.certificates ? ` · ${tr.certificates}` : ''}</div>
                  <div className="row"><Icon name="phone" size={15} className="ok" />{tr.phone ?? '—'}</div>
                </div>
                <div className="row mt-16" style={{ gap: 4 }}>
                  {DAYS.map((d, i) => <span key={d} className={`chip ${days.has(i + 1) ? 'on' : ''}`} style={{ padding: '0 7px' }}>{d}</span>)}
                </div>
                <div className="row between mt-16">
                  <span className="tiny faint">{tn('{n} hội viên · {h} giờ/tuần', { n: <b className="num" style={{ color: 'var(--ink)', fontSize: 16 }}>{tr.memberCount}</b>, h: Math.round(hours) })}</span>
                  <div className="row" style={{ gap: 2 }}>
                    <Button size="sm" variant="ghost" icon="clock" aria-label="Ca làm" title="Ca làm" onClick={() => setShifts(tr)} />
                    <Button size="sm" variant="ghost" icon="edit" aria-label="Sửa" onClick={() => setEditing(tr)} />
                    <Button size="sm" variant="ghost" icon={tr.active ? 'ban' : 'play'} aria-label={tr.active ? 'Tạm ngừng' : 'Kích hoạt'} title={tr.active ? 'Tạm ngừng nhận HV' : 'Kích hoạt'} onClick={() => setToggling(tr)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <TrainerForm trainer={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)}
        onSaved={(c) => { setEditing(null); void reload(); if (c) setCreated(c); }} />}
      {shifts && (
        <Modal title={t('Ca làm · {name}', { name: shifts.fullName })} size="wide" onClose={() => setShifts(null)}>
          <ShiftEditor trainer={shifts} onSaved={() => { setShifts(null); void reload(); }} />
        </Modal>
      )}
      {toggling && <Confirm title={toggling.active ? 'Tạm ngừng HLV?' : 'Kích hoạt HLV?'} confirmText={toggling.active ? 'Tạm ngừng' : 'Kích hoạt'} danger={toggling.active}
        message={toggling.active ? t('{name} sẽ không được phân công hội viên mới hay xếp lịch mới. Hội viên hiện tại vẫn giữ nguyên.', { name: toggling.fullName }) : t('{name} sẽ nhận hội viên mới trở lại.', { name: toggling.fullName })}
        onClose={() => setToggling(null)}
        onConfirm={async () => { try { await api.put(`/trainers/${toggling.id}/active`, { active: !toggling.active }); toast.success('Đã cập nhật'); void reload(); } catch (e) { toast.error(errMsg(e)); throw e; } }} />}
      {created && (
        <Modal title="Đã tạo HLV" size="narrow" onClose={() => setCreated(null)} footer={<Button variant="primary" onClick={() => setCreated(null)}>Đã hiểu</Button>}>
          <div className="stack">
            <Person name={created.trainer.fullName} sub={created.trainer.email} />
            {created.temporaryPassword ? <Alert kind="info">{tn('Mật khẩu tạm: {pw}', { pw: <b className="num">{created.temporaryPassword}</b> })}</Alert> : <Alert kind="success">HLV dùng mật khẩu bạn đã đặt.</Alert>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function TrainerForm({ trainer, onClose, onSaved }: { trainer?: Trainer; onClose: () => void; onSaved: (c?: TrainerCreated) => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    email: '', password: '', fullName: trainer?.fullName ?? '', phone: trainer?.phone ?? '', specialty: trainer?.specialty ?? '',
    experienceYears: String(trainer?.experienceYears ?? 0), certificates: trainer?.certificates ?? '', bio: trainer?.bio ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const v: Record<string, string> = {};
    if (!f.fullName.trim()) v.fullName = 'Nhập họ tên';
    if (!trainer && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) v.email = 'Email không hợp lệ';
    if (!trainer && f.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(f.password)) v.password = 'Tối thiểu 8 ký tự, gồm chữ và số';
    if (!/^$|^(0|\+84)\d{9,10}$/.test(f.phone.trim())) v.phone = 'SĐT không hợp lệ';
    const y = Number(f.experienceYears);
    if (!Number.isInteger(y) || y < 0 || y > 60) v.experienceYears = 'Từ 0 đến 60';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    const body = { ...f, experienceYears: y, password: f.password || null, phone: f.phone.trim() };
    try {
      if (trainer) { await api.put(`/trainers/${trainer.id}`, body); toast.success('Đã lưu'); onSaved(); }
      else { const c = await api.post<TrainerCreated>('/trainers', body); toast.success('Đã thêm HLV'); onSaved(c); }
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={trainer ? 'Sửa HLV' : 'Thêm huấn luyện viên'} onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          <Field label="Họ và tên" error={errors.fullName} required className="span-2"><Input maxLength={100} value={f.fullName} onChange={(e) => set('fullName', e.target.value)} /></Field>
          {!trainer && <>
            <Field label="Email đăng nhập" error={errors.email} required><Input type="email" maxLength={120} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Mật khẩu" error={errors.password} hint="Để trống: tự tạo mật khẩu tạm"><PasswordInput value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></Field>
          </>}
          <Field label="Số điện thoại" error={errors.phone}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Kinh nghiệm (năm)" error={errors.experienceYears}><Input type="number" min={0} max={60} value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
          <Field label="Chuyên môn" className="span-2"><Input maxLength={150} value={f.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Giảm mỡ, powerlifting, yoga…" /></Field>
          <Field label="Chứng chỉ" className="span-2"><Input maxLength={255} value={f.certificates} onChange={(e) => set('certificates', e.target.value)} /></Field>
          <Field label="Giới thiệu" className="span-2"><Textarea maxLength={1000} value={f.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
