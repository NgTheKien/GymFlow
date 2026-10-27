import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Member, MemberDetail as Detail, MemberStatus, Subscription } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { ProgressPanel } from '../../components/ProgressPanel';
import { SubscriptionForm } from '../../components/SubscriptionForm';
import { useToast } from '../../components/Toast';
import { Avatar, Badge, Button, Card, Confirm, Empty, ErrorState, Field, LoadingBlock, Modal, Segmented, Select, Stat, StatusBadge, Textarea } from '../../components/ui';
import { age, fmtDate, fmtMoney, genderLabel, memberStatus, planStatus, subState } from '../../lib/format';
import { errMsg, useAsync } from '../../lib/hooks';
import { ScheduleForm } from './Schedules';
import { MemberFormModal } from './Members';

type Tab = 'overview' | 'progress' | 'plans';

export default function MemberDetail() {
  const { id } = useParams();
  const memberId = Number(id);
  const me = useMe();
  const admin = me.role === 'ADMIN';
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<'edit' | 'subscribe' | 'schedule' | 'status' | null>(null);
  const [cancelling, setCancelling] = useState<Subscription | null>(null);
  const { data, error, loading, reload } = useAsync(() => api.get<Detail>(`/members/${memberId}`), [memberId]);

  if (error) return <div className="page"><ErrorState message={error} onRetry={reload} /><Link to="/members" className="link small mt-16" style={{ display: 'inline-block' }}>← Danh sách hội viên</Link></div>;
  if (loading || !data) return <div className="page"><LoadingBlock rows={8} /></div>;
  const m = data.member;
  const rate = data.totalSessions ? Math.round((data.completedSessions / data.totalSessions) * 100) : null;

  return (
    <div className="page">
      <Link to="/members" className="link small row" style={{ gap: 6, marginBottom: 14 }}><Icon name="arrowLeft" size={15} />Danh sách hội viên</Link>
      <div className="hero" style={{ marginBottom: 22 }}>
        <div className="row between row-wrap" style={{ position: 'relative', gap: 18 }}>
          <div className="row" style={{ gap: 16 }}>
            <Avatar name={m.fullName} size="lg" />
            <div>
              <h2>{m.fullName}</h2>
              <div className="row row-wrap mt-8" style={{ gap: 8 }}>
                <span className="chip">{m.code}</span>
                <StatusBadge map={memberStatus} value={m.status} />
                {m.subscriptionState && <StatusBadge map={subState} value={m.subscriptionState} />}
                {m.accountStatus === 'LOCKED' && <Badge tone="red">Tài khoản bị khoá</Badge>}
              </div>
            </div>
          </div>
          <div className="row row-wrap">
            <Button icon="calendar" onClick={() => setModal('schedule')}>Xếp lịch</Button>
            <Button icon="clipboard" onClick={() => navigate(`/workout-plans/new?memberId=${m.id}`)}>Soạn giáo án</Button>
            {admin && <Button icon="edit" onClick={() => setModal('edit')}>Sửa</Button>}
            {admin && <Button icon="refresh" onClick={() => setModal('status')}>Trạng thái</Button>}
            {admin && <Button variant="primary" icon="card" onClick={() => setModal('subscribe')}>Đăng ký / gia hạn</Button>}
          </div>
        </div>
      </div>

      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { value: 'overview', label: 'Tổng quan' }, { value: 'progress', label: 'Tiến độ' }, { value: 'plans', label: `Giáo án (${data.plans.length})` },
      ]} />

      <div className="mt-16">
        {tab === 'overview' && (
          <div className="stack" style={{ gap: 18 }}>
            <div className="grid grid-4">
              <Stat icon="ticket" label="Gói hiện tại" value={m.daysLeft ?? '—'} unit={m.daysLeft != null ? 'ngày' : undefined} foot={m.currentPlanName ?? 'Chưa có gói'} />
              <Stat icon="checkCircle" label="Buổi hoàn thành" value={data.completedSessions} accent="#3d97ff" foot={`/${data.totalSessions} buổi đã xếp`} />
              <Stat icon="target" label="Tỉ lệ hoàn thành" value={rate ?? '—'} unit={rate != null ? '%' : undefined} accent="#8b7cff" foot="Không tính buổi đã huỷ" />
              <Stat icon="scale" label="Cân nặng gần nhất" value={data.latestWeight?.weightKg ?? '—'} unit={data.latestWeight ? 'kg' : undefined} accent="#ffb020" foot={data.latestWeight ? fmtDate(data.latestWeight.recordedDate) : '—'} />
            </div>
            <div className="grid grid-main">
              <Card title="Lịch sử gói tập" icon="card" flush>
                {data.subscriptions.length === 0 ? <Empty icon="ticket" title="Chưa đăng ký gói nào" action={admin && <Button variant="primary" size="sm" onClick={() => setModal('subscribe')}>Đăng ký ngay</Button>} /> : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Gói</th><th>Thời gian</th><th>Số tiền</th><th>Trạng thái</th>{admin && <th />}</tr></thead>
                      <tbody>
                        {data.subscriptions.map((s) => (
                          <tr key={s.id}>
                            <td><b>{s.planName}</b>{s.note && <div className="tiny faint ellipsis" style={{ maxWidth: 220 }}>{s.note}</div>}</td>
                            <td className="nowrap small">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</td>
                            <td className="num">{fmtMoney(s.pricePaid)}</td>
                            <td><StatusBadge map={subState} value={s.state} />{(s.state === 'ACTIVE' || s.state === 'EXPIRING') && <div className="tiny faint mt-4">còn {s.daysLeft} ngày</div>}</td>
                            {admin && <td className="actions">{!s.cancelled && s.state !== 'EXPIRED' && <Button size="sm" variant="ghost" icon="ban" aria-label="Huỷ gói" title="Huỷ gói" onClick={() => setCancelling(s)} />}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <Card title="Thông tin" icon="user">
                <dl className="kv small">
                  <dt>Email</dt><dd className="ellipsis">{m.email}</dd>
                  <dt>Điện thoại</dt><dd>{m.phone ?? '—'}</dd>
                  <dt>Giới tính</dt><dd>{m.gender ? genderLabel[m.gender] : '—'}</dd>
                  <dt>Ngày sinh</dt><dd>{fmtDate(m.dateOfBirth)}{age(m.dateOfBirth) != null && <span className="faint"> · {age(m.dateOfBirth)} tuổi</span>}</dd>
                  <dt>Chiều cao</dt><dd>{m.heightCm ? `${m.heightCm} cm` : '—'}</dd>
                  <dt>Mục tiêu</dt><dd>{m.goal ?? '—'}</dd>
                  <dt>HLV</dt><dd>{m.trainerName ?? <span className="faint">Chưa phân công</span>}</dd>
                  <dt>Địa chỉ</dt><dd>{m.address ?? '—'}</dd>
                  <dt>Tham gia</dt><dd>{fmtDate(m.joinedAt)}</dd>
                  {m.note && <><dt>Ghi chú</dt><dd className="warn">{m.note}</dd></>}
                </dl>
              </Card>
            </div>
          </div>
        )}
        {tab === 'progress' && <ProgressPanel memberId={m.id} />}
        {tab === 'plans' && (
          <Card flush>
            {data.plans.length === 0 ? <Empty icon="clipboard" title="Chưa có giáo án" action={<Button variant="primary" size="sm" onClick={() => navigate(`/workout-plans/new?memberId=${m.id}`)}>Soạn giáo án</Button>} /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Giáo án</th><th>HLV</th><th>Thời gian</th><th>Nội dung</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {data.plans.map((p) => (
                      <tr key={p.id} className="clickable" onClick={() => navigate(`/workout-plans/${p.id}`)}>
                        <td><b>{p.name}</b><div className="tiny faint">{p.goal}</div></td>
                        <td>{p.trainerName ?? '—'}</td>
                        <td className="small nowrap">{fmtDate(p.startDate)} → {fmtDate(p.endDate)}</td>
                        <td className="small">{p.trainingDays} ngày/tuần · {p.itemCount} bài</td>
                        <td><StatusBadge map={planStatus} value={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {modal === 'edit' && <MemberFormModal member={m} onClose={() => setModal(null)} onSaved={() => { setModal(null); void reload(); }} />}
      {modal === 'subscribe' && <SubscriptionForm memberId={m.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); void reload(); }} />}
      {modal === 'schedule' && <ScheduleForm presetMemberId={m.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast.info('Xem lịch trong mục Lịch tập'); }} />}
      {modal === 'status' && <StatusModal member={m} onClose={() => setModal(null)} onSaved={() => { setModal(null); void reload(); }} />}
      {cancelling && <CancelSubscription sub={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); void reload(); }} />}
    </div>
  );
}

function StatusModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Trạng thái hội viên" size="narrow" onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" loading={busy} onClick={async () => {
        setBusy(true);
        try { await api.put(`/members/${member.id}/status`, { status }); toast.success('Đã cập nhật trạng thái'); onSaved(); }
        catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
      }}>Lưu</Button>
    </>}>
      <Field label="Trạng thái" hint="Bảo lưu: tạm dừng tập. Ngừng: không đăng ký gói mới được.">
        <Select value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>
          {(Object.keys(memberStatus) as MemberStatus[]).map((s) => <option key={s} value={s}>{memberStatus[s][0]}</option>)}
        </Select>
      </Field>
    </Modal>
  );
}

export function CancelSubscription({ sub, onClose, onDone }: { sub: Subscription; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Confirm danger title={`Huỷ gói ${sub.planName}?`} confirmText="Huỷ gói" onClose={() => { setOpen(false); onClose(); }}
      message={<div className="stack">
        <span>Gói của <b>{sub.memberName}</b> ({fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}) sẽ hết hiệu lực ngay. Thao tác được ghi vào nhật ký.</span>
        <Textarea maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do huỷ (không bắt buộc)" />
      </div>}
      onConfirm={async () => {
        try { await api.put(`/subscriptions/${sub.id}/cancel`, { reason: reason || null }); toast.success('Đã huỷ gói'); onDone(); }
        catch (e) { toast.error(errMsg(e)); throw e; }
      }} />
  );
}
