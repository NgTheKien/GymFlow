import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Page, Role, UserAccount, UserCreated, UserStatus } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, Pager, PasswordInput, Person, SearchInput, Select, StatusBadge } from '../../components/ui';
import { fmtDateTime, relativeTime, roleLabel, userStatus } from '../../lib/format';
import { errMsg, fieldErrs, useAsync, useDebounced } from '../../lib/hooks';
import { t } from '../../i18n';

const roleTone = { ADMIN: 'violet', TRAINER: 'blue', MEMBER: 'green' } as const;

export default function Users() {
  const me = useMe();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'' | Role>('');
  const [status, setStatus] = useState<'' | UserStatus>('');
  const [page, setPage] = useState(0);
  const [locking, setLocking] = useState<UserAccount | null>(null);
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const [temp, setTemp] = useState<{ user: UserAccount; password: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const dq = useDebounced(q);
  useEffect(() => setPage(0), [dq, role, status]);
  const { data, error, loading, reload } = useAsync(() => api.get<Page<UserAccount>>('/users', { q: dq, role, status, page, size: 20 }), [dq, role, status, page]);

  return (
    <div className="page">
      <PageHead eyebrow="Hệ thống" title="Tài khoản & quyền" desc="Khoá tài khoản có hiệu lực ngay lập tức, kể cả với phiên đang đăng nhập. Mọi thao tác đều được ghi nhật ký."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Thêm quản lý</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm tên hoặc email…" />
        <Select value={role} onChange={(e) => setRole(e.target.value as Role | '')} aria-label="Vai trò">
          <option value="">{t('Mọi vai trò')}</option>{(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus | '')} aria-label="Trạng thái">
          <option value="">{t('Mọi trạng thái')}</option><option value="ACTIVE">{t('Đang mở')}</option><option value="LOCKED">{t('Đã khoá')}</option>
        </Select>
      </div>
      <Card flush>
        {error ? <div style={{ padding: 20 }}><ErrorState message={error} onRetry={reload} /></div> : loading && !data ? <div style={{ padding: 20 }}><LoadingBlock /></div>
          : data && data.content.length === 0 ? <Empty icon="userCog" title="Không có tài khoản phù hợp" /> : data && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('Tài khoản')}</th><th>{t('Vai trò')}</th><th>{t('Trạng thái')}</th><th>{t('Đăng nhập gần nhất')}</th><th>{t('Tạo lúc')}</th><th /></tr></thead>
                  <tbody>
                    {data.content.map((u) => (
                      <tr key={u.id}>
                        <td><Person name={u.fullName} sub={u.email} size="sm" /></td>
                        <td><Badge tone={roleTone[u.role]}>{roleLabel[u.role]}</Badge></td>
                        <td><StatusBadge map={userStatus} value={u.status} /></td>
                        <td className="small muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : t('Chưa đăng nhập')}</td>
                        <td className="tiny faint nowrap">{fmtDateTime(u.createdAt)}</td>
                        <td className="actions">
                          <Button size="sm" variant="ghost" icon="key" aria-label="Cấp mật khẩu tạm" title="Cấp mật khẩu tạm" onClick={() => setResetting(u)} />
                          {u.id !== me.id && <Button size="sm" variant="ghost" icon={u.status === 'LOCKED' ? 'unlock' : 'lock'} aria-label={u.status === 'LOCKED' ? 'Mở khoá' : 'Khoá'} title={u.status === 'LOCKED' ? 'Mở khoá' : 'Khoá'} onClick={() => setLocking(u)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
            </>
          )}
      </Card>

      {locking && <Confirm danger={locking.status !== 'LOCKED'} title={locking.status === 'LOCKED' ? 'Mở khoá tài khoản?' : 'Khoá tài khoản?'}
        confirmText={locking.status === 'LOCKED' ? 'Mở khoá' : 'Khoá'} onClose={() => setLocking(null)}
        message={locking.status === 'LOCKED' ? t('{email} sẽ đăng nhập lại được.', { email: locking.email }) : t('{email} sẽ bị đăng xuất khỏi mọi phiên và không đăng nhập được.', { email: locking.email })}
        onConfirm={async () => {
          try { await api.put(`/users/${locking.id}/status`, { status: locking.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' }); toast.success('Đã cập nhật'); void reload(); }
          catch (e) { toast.error(errMsg(e)); throw e; }
        }} />}
      {resetting && <Confirm title="Cấp mật khẩu tạm?" confirmText="Cấp mật khẩu" onClose={() => setResetting(null)}
        message={t('Mật khẩu hiện tại của {email} sẽ bị thay bằng mật khẩu tạm.', { email: resetting.email })}
        onConfirm={async () => {
          try { const r = await api.post<{ temporaryPassword: string }>(`/users/${resetting.id}/reset-password`); setTemp({ user: resetting, password: r.temporaryPassword }); }
          catch (e) { toast.error(errMsg(e)); throw e; }
        }} />}
      {temp && (
        <Modal title="Mật khẩu tạm" size="narrow" onClose={() => setTemp(null)} footer={<>
          <Button onClick={() => { void navigator.clipboard?.writeText(temp.password); toast.success('Đã sao chép'); }} icon="copy">Sao chép</Button>
          <Button variant="primary" onClick={() => setTemp(null)}>Xong</Button>
        </>}>
          <div className="stack">
            <Person name={temp.user.fullName} sub={temp.user.email} />
            <div className="num" style={{ fontSize: 30, letterSpacing: 2, textAlign: 'center', padding: 16, background: 'var(--rail)', borderRadius: 12 }}>{temp.password}</div>
            <p className="small muted">{t('Mật khẩu chỉ hiển thị một lần. Gửi trực tiếp cho người dùng và nhắc đổi ngay.')}</p>
          </div>
        </Modal>
      )}
      {creating && <AdminForm onClose={() => setCreating(false)} onSaved={(c) => { setCreating(false); void reload(); if (c.temporaryPassword) setTemp({ user: c.user, password: c.temporaryPassword }); }} />}
    </div>
  );
}

function AdminForm({ onClose, onSaved }: { onClose: () => void; onSaved: (c: UserCreated) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ email: '', fullName: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const v: Record<string, string> = {};
    if (!f.fullName.trim()) v.fullName = 'Nhập họ tên';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) v.email = 'Email không hợp lệ';
    if (f.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(f.password)) v.password = 'Tối thiểu 8 ký tự, gồm chữ và số';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try { const c = await api.post<UserCreated>('/users', { ...f, password: f.password || null }); toast.success('Đã tạo tài khoản quản lý'); onSaved(c); }
    catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title="Thêm tài khoản quản lý" size="narrow" onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" loading={busy} onClick={submit}>Tạo</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <Alert kind="info">Hội viên và HLV được tạo ở trang tương ứng để có đủ hồ sơ.</Alert>
        <Field label="Họ và tên" error={errors.fullName} required><Input maxLength={100} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Email" error={errors.email} required><Input type="email" maxLength={120} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Số điện thoại"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Mật khẩu" error={errors.password} hint="Để trống: tự tạo mật khẩu tạm"><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
      </div>
    </Modal>
  );
}
