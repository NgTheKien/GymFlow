import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Gender, Member, MemberCreated, MemberForm as Form, MemberStatus, Page, Trainer } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, Pager, PasswordInput, Person, SearchInput, Select, StatusBadge, Textarea } from '../../components/ui';
import { downloadCsv } from '../../lib/csv';
import { fmtDate, genderLabel, memberStatus, subState } from '../../lib/format';
import { errMsg, fieldErrs, useAsync, useDebounced } from '../../lib/hooks';

export default function Members() {
  const me = useMe();
  const admin = me.role === 'ADMIN';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | MemberStatus>('');
  const [trainerId, setTrainerId] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(admin && params.get('new') === '1');
  const [created, setCreated] = useState<MemberCreated | null>(null);
  const dq = useDebounced(q);
  useEffect(() => setPage(0), [dq, status, trainerId]);

  const trainers = useAsync(() => (admin ? api.get<Trainer[]>('/trainers') : Promise.resolve([] as Trainer[])), [admin]);
  const { data, error, loading, reload } = useAsync(
    () => api.get<Page<Member>>('/members', { q: dq, status, trainerId, page, size: 15 }), [dq, status, trainerId, page]);

  const exportCsv = async () => {
    const all = await api.get<Page<Member>>('/members', { q: dq, status, trainerId, size: 200 });
    downloadCsv(`hoi-vien-${new Date().toISOString().slice(0, 10)}`, all.content, [
      { header: 'Mã', value: (m) => m.code }, { header: 'Họ tên', value: (m) => m.fullName }, { header: 'Email', value: (m) => m.email },
      { header: 'SĐT', value: (m) => m.phone }, { header: 'Giới tính', value: (m) => (m.gender ? genderLabel[m.gender] : '') },
      { header: 'HLV', value: (m) => m.trainerName }, { header: 'Trạng thái', value: (m) => memberStatus[m.status][0] },
      { header: 'Gói hiện tại', value: (m) => m.currentPlanName }, { header: 'Hết hạn', value: (m) => m.subscriptionEndDate },
      { header: 'Ngày tham gia', value: (m) => m.joinedAt },
    ]);
  };

  const closeCreate = () => { setCreating(false); if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }); } };

  return (
    <div className="page">
      <PageHead eyebrow={admin ? 'Quản lý' : 'Học viên của tôi'} title="Hội viên"
        desc={admin ? 'Tra cứu, thêm mới, phân công HLV và theo dõi tình trạng gói tập.' : 'Danh sách hội viên bạn đang phụ trách.'}
        actions={<>
          <Button icon="download" onClick={() => void exportCsv()}>Xuất CSV</Button>
          {admin && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Thêm hội viên</Button>}
        </>} />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên, email, SĐT, mã HV…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as MemberStatus | '')} aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          {(Object.keys(memberStatus) as MemberStatus[]).map((s) => <option key={s} value={s}>{memberStatus[s][0]}</option>)}
        </Select>
        {admin && (
          <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} aria-label="HLV">
            <option value="">Mọi HLV</option>
            {trainers.data?.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </Select>
        )}
      </div>

      <Card flush>
        {error ? <div style={{ padding: 20 }}><ErrorState message={error} onRetry={reload} /></div>
          : loading && !data ? <div style={{ padding: 20 }}><LoadingBlock rows={6} /></div>
            : data && data.content.length === 0 ? <Empty icon="users" title="Không có hội viên phù hợp" desc="Thử đổi từ khoá hoặc bộ lọc." />
              : data && (
                <>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Hội viên</th><th>Liên hệ</th><th>HLV</th><th>Gói hiện tại</th><th>Trạng thái</th><th>Tham gia</th></tr></thead>
                      <tbody>
                        {data.content.map((m) => (
                          <tr key={m.id} className="clickable" onClick={() => navigate(`/members/${m.id}`)}>
                            <td><Person name={m.fullName} sub={m.code} /></td>
                            <td><div className="small">{m.phone ?? '—'}</div><div className="tiny faint">{m.email}</div></td>
                            <td>{m.trainerName ?? <span className="faint">Chưa phân công</span>}</td>
                            <td>
                              {m.currentPlanName ? <div className="stack-sm" style={{ gap: 4 }}>
                                <span className="small">{m.currentPlanName}</span>
                                <span className="row" style={{ gap: 6 }}><StatusBadge map={subState} value={m.subscriptionState} />{m.subscriptionState !== 'EXPIRED' && m.daysLeft != null && <span className="tiny faint">{m.daysLeft} ngày</span>}</span>
                              </div> : <Badge tone="muted">Chưa có gói</Badge>}
                            </td>
                            <td><StatusBadge map={memberStatus} value={m.status} />{m.accountStatus === 'LOCKED' && <div className="mt-4"><Badge tone="red">TK khoá</Badge></div>}</td>
                            <td className="nowrap muted">{fmtDate(m.joinedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
                </>
              )}
      </Card>

      {creating && <MemberFormModal onClose={closeCreate} onSaved={(res) => { closeCreate(); void reload(); if (res && 'temporaryPassword' in res) setCreated(res); }} />}
      {created && (
        <Modal title="Đã tạo hội viên" size="narrow" onClose={() => setCreated(null)} footer={<>
          <Button onClick={() => setCreated(null)}>Đóng</Button>
          <Button variant="primary" onClick={() => navigate(`/members/${created.member.id}`)}>Mở hồ sơ</Button>
        </>}>
          <div className="stack">
            <Person name={created.member.fullName} sub={`${created.member.code} · ${created.member.email}`} size="lg" />
            {created.temporaryPassword
              ? <Alert kind="info">Mật khẩu tạm: <b className="num" style={{ letterSpacing: 1 }}>{created.temporaryPassword}</b>. Gửi cho hội viên và nhắc đổi sau lần đăng nhập đầu.</Alert>
              : <Alert kind="success">Hội viên dùng mật khẩu bạn vừa đặt để đăng nhập.</Alert>}
            <p className="small muted">Bước tiếp theo: đăng ký gói tập cho hội viên trong trang hồ sơ.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

const PHONE = /^$|^(0|\+84)\d{9,10}$/;

/** Thêm mới (có email & mật khẩu) hoặc sửa hội viên. */
export function MemberFormModal({ member, onClose, onSaved }: { member?: Member; onClose: () => void; onSaved: (res: MemberCreated | Member) => void }) {
  const toast = useToast();
  const [f, setF] = useState<Form>({
    email: member?.email ?? '', password: '', fullName: member?.fullName ?? '', phone: member?.phone ?? '',
    dateOfBirth: member?.dateOfBirth ?? null, gender: member?.gender ?? null, heightCm: member?.heightCm ?? null,
    goal: member?.goal ?? '', address: member?.address ?? '', trainerId: member?.trainerId ?? null, note: member?.note ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trainers = useAsync(() => api.get<Trainer[]>('/trainers'), []);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    const v: Record<string, string> = {};
    if (!f.fullName.trim()) v.fullName = 'Nhập họ tên';
    if (!member && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email ?? '')) v.email = 'Email không hợp lệ';
    if (!member && f.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(f.password)) v.password = 'Tối thiểu 8 ký tự, gồm chữ và số';
    if (!PHONE.test(f.phone.trim())) v.phone = 'SĐT dạng 0xxxxxxxxx hoặc +84…';
    if (f.heightCm != null && (f.heightCm < 80 || f.heightCm > 250)) v.heightCm = 'Từ 80 đến 250 cm';
    if (f.dateOfBirth && f.dateOfBirth >= new Date().toISOString().slice(0, 10)) v.dateOfBirth = 'Ngày sinh phải ở quá khứ';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    const body = { ...f, phone: f.phone.trim(), fullName: f.fullName.trim(), email: f.email?.trim(), password: f.password || null };
    try {
      if (member) {
        const res = await api.put<Member>(`/members/${member.id}`, body);
        toast.success('Đã cập nhật hội viên');
        onSaved(res);
      } else {
        const res = await api.post<MemberCreated>('/members', body);
        toast.success(`Đã thêm ${res.member.fullName} (${res.member.code})`);
        onSaved(res);
      }
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title={member ? `Sửa hội viên ${member.code}` : 'Thêm hội viên'} onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>{member ? 'Lưu thay đổi' : 'Tạo hội viên'}</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          <Field label="Họ và tên" error={errors.fullName} required className="span-2"><Input maxLength={100} value={f.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Nguyễn Văn A" /></Field>
          {!member && <>
            <Field label="Email đăng nhập" error={errors.email} required><Input type="email" maxLength={120} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="hoivien@gmail.com" /></Field>
            <Field label="Mật khẩu" error={errors.password} hint="Để trống: hệ thống tự tạo mật khẩu tạm"><PasswordInput value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></Field>
          </>}
          <Field label="Số điện thoại" error={errors.phone}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0912345678" /></Field>
          <Field label="Ngày sinh" error={errors.dateOfBirth}><Input type="date" value={f.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value || null)} /></Field>
          <Field label="Giới tính">
            <Select value={f.gender ?? ''} onChange={(e) => set('gender', (e.target.value || null) as Gender | null)}>
              <option value="">—</option>
              {(Object.keys(genderLabel) as Gender[]).map((g) => <option key={g} value={g}>{genderLabel[g]}</option>)}
            </Select>
          </Field>
          <Field label="Chiều cao (cm)" error={errors.heightCm}><Input type="number" min={80} max={250} value={f.heightCm ?? ''} onChange={(e) => set('heightCm', e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Huấn luyện viên phụ trách">
            <Select value={f.trainerId ?? ''} onChange={(e) => set('trainerId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Chưa phân công</option>
              {trainers.data?.filter((t) => t.active || t.id === f.trainerId).map((t) => <option key={t.id} value={t.id}>{t.fullName} · {t.memberCount} HV</option>)}
            </Select>
          </Field>
          <Field label="Mục tiêu tập luyện"><Input maxLength={255} value={f.goal} onChange={(e) => set('goal', e.target.value)} placeholder="Giảm mỡ, tăng cơ…" /></Field>
          <Field label="Địa chỉ" className="span-2"><Input maxLength={255} value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Ghi chú nội bộ" className="span-2"><Textarea maxLength={255} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="VD: chấn thương gối cũ, tránh nhảy cao" /></Field>
        </div>
      </div>
    </Modal>
  );
}
