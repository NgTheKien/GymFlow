import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { AuthOptions, RegisterRequest, RegisterResponse } from '../api/types';
import { Icon } from '../components/Icon';
import { Alert, Button, Field, Input, Modal, PasswordInput } from '../components/ui';
import { errMsg, fieldErrs, useAsync } from '../lib/hooks';
import { AuthArt } from './Login';
import { PrivacyContent, TermsContent } from './Policies';

// Trùng quy tắc với backend (Dtos.PASSWORD_RULE / PHONE_RULE) để báo lỗi ngay, server vẫn kiểm tra lại.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^(0|\+84)\d{9,10}$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

const EMPTY: RegisterRequest = { fullName: '', email: '', phone: '', password: '', confirmPassword: '', acceptTerms: false };

function validate(f: RegisterRequest) {
  const v: Record<string, string> = {};
  const name = f.fullName.trim();
  if (!name) v.fullName = 'Vui lòng nhập họ tên';
  else if (name.length < 2 || name.length > 100) v.fullName = 'Họ tên từ 2 đến 100 ký tự';
  if (!f.email.trim()) v.email = 'Vui lòng nhập email';
  else if (!EMAIL_RE.test(f.email.trim())) v.email = 'Email không hợp lệ';
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) v.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
  if (!f.password) v.password = 'Vui lòng nhập mật khẩu';
  else if (!PW_RE.test(f.password)) v.password = 'Tối thiểu 8 ký tự, gồm cả chữ và số';
  if (!f.confirmPassword) v.confirmPassword = 'Vui lòng nhập lại mật khẩu';
  else if (f.confirmPassword !== f.password) v.confirmPassword = 'Mật khẩu nhập lại không khớp';
  if (!f.acceptTerms) v.acceptTerms = 'Bạn cần đồng ý để tiếp tục';
  return v;
}

function Strength({ pw }: { pw: string }) {
  if (!pw) return null;
  const s = [/.{8,}/, /[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const color = s >= 4 ? 'var(--primary-bright)' : s >= 3 ? 'var(--warning)' : 'var(--error)';
  return (
    <div className="row" style={{ gap: 4 }} aria-live="polite">
      {[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= s ? color : 'var(--surface)' }} />)}
      <span className="tiny faint" style={{ marginLeft: 6, minWidth: 34 }}>{s >= 4 ? 'Mạnh' : s >= 3 ? 'Khá' : 'Yếu'}</span>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const options = useAsync(() => api.get<AuthOptions>('/auth/options'), []);
  const [f, setF] = useState<RegisterRequest>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<'terms' | 'privacy' | null>(null);
  const inFlight = useRef(false);

  const set = <K extends keyof RegisterRequest>(k: K, val: RegisterRequest[K]) => {
    setF((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const v = validate(f);
    setErrors(v); setError(null);
    if (Object.keys(v).length) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(v)[0]}"]`)?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const res = await api.post<RegisterResponse>('/auth/register', {
        ...f, fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone.trim(),
      });
      navigate('/login', { replace: true, state: { registered: res.email } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: err.message });
        setError(null);
      } else {
        setError(errMsg(err));
        setErrors(fieldErrs(err));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const closed = options.data && !options.data.registrationEnabled;

  return (
    <div className="auth">
      <AuthArt title={['Bắt đầu hôm nay.', 'Mạnh hơn mỗi tuần.']} lines={[
        { icon: 'user', text: 'Tạo tài khoản hội viên miễn phí trong 1 phút' },
        { icon: 'ticket', text: 'Chọn gói tập phù hợp, kích hoạt tại quầy lễ tân' },
        { icon: 'trophy', text: 'Theo dõi lịch tập, giáo án và tiến độ ngay trên điện thoại' },
      ]} />
      <div className="auth-form">
        <form className="box stack page" onSubmit={submit} noValidate>
          <Link to="/" className="link small row" style={{ gap: 6, width: 'fit-content' }}><Icon name="arrowLeft" size={15} />Trang chủ</Link>
          <div>
            <div className="kicker">Hội viên mới</div>
            <h2>Đăng ký hội viên</h2>
            <p className="muted mt-8">Đã có tài khoản? <Link to="/login" className="link">Đăng nhập</Link></p>
          </div>

          {closed ? (
            <Alert kind="info">Đăng ký trực tuyến đang tạm đóng. Vui lòng liên hệ quầy lễ tân để được tạo tài khoản.</Alert>
          ) : (
            <>
              {error && <Alert kind="error">{error}</Alert>}
              <Field label="Họ và tên" error={errors.fullName} required>
                <Input name="fullName" autoComplete="name" value={f.fullName} invalid={!!errors.fullName} maxLength={100}
                  onChange={(e) => set('fullName', e.target.value)} placeholder="Nguyễn Văn An" />
              </Field>
              <Field label="Email" error={errors.email} required hint="Dùng để đăng nhập và khôi phục mật khẩu">
                <div className="input-icon">
                  <Icon name="mail" />
                  <input name="email" className={`input ${errors.email ? 'has-err' : ''}`} type="email" autoComplete="email" maxLength={120}
                    value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="ban@email.com" aria-invalid={!!errors.email} />
                </div>
              </Field>
              {errors.email === 'Email đã được sử dụng' && (
                <p className="tiny muted" style={{ marginTop: -6 }}>Email này đã có tài khoản. <Link className="link" to="/login" state={{ registered: f.email.trim() }}>Đăng nhập</Link> hoặc <Link className="link" to="/forgot-password">khôi phục mật khẩu</Link>.</p>
              )}
              <Field label="Số điện thoại" error={errors.phone} hint="Không bắt buộc – để huấn luyện viên liên hệ khi đổi lịch">
                <div className="input-icon">
                  <Icon name="phone" />
                  <input name="phone" className={`input ${errors.phone ? 'has-err' : ''}`} type="tel" inputMode="tel" autoComplete="tel"
                    value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0912 345 678" aria-invalid={!!errors.phone} />
                </div>
              </Field>
              <Field label="Mật khẩu" error={errors.password} required hint="Tối thiểu 8 ký tự, gồm cả chữ và số">
                <PasswordInput name="password" autoComplete="new-password" value={f.password} invalid={!!errors.password}
                  onChange={(e) => set('password', e.target.value)} />
              </Field>
              <Strength pw={f.password} />
              <Field label="Nhập lại mật khẩu" error={errors.confirmPassword} required>
                <PasswordInput name="confirmPassword" autoComplete="new-password" value={f.confirmPassword} invalid={!!errors.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)} />
              </Field>
              <div className="field">
                <label className="check" style={{ alignItems: 'flex-start', color: 'var(--ink)' }}>
                  <input name="acceptTerms" type="checkbox" checked={f.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} style={{ marginTop: 2 }} />
                  <span className="small">Tôi đồng ý với <button type="button" className="link-btn" onClick={() => setDoc('terms')}>Điều khoản sử dụng</button> và <button type="button" className="link-btn" onClick={() => setDoc('privacy')}>Chính sách bảo mật</button></span>
                </label>
                {errors.acceptTerms && <div className="err">{errors.acceptTerms}</div>}
              </div>
              <Button type="submit" variant="primary" size="lg" block loading={busy}>Tạo tài khoản</Button>
              <p className="tiny faint center">Tài khoản tự đăng ký luôn là hội viên. Tài khoản huấn luyện viên và quản lý do phòng tập cấp.</p>
            </>
          )}
        </form>
      </div>
      {doc && (
        <Modal title={doc === 'terms' ? 'Điều khoản sử dụng' : 'Chính sách bảo mật'} onClose={() => setDoc(null)}
          footer={<Button variant="primary" onClick={() => { set('acceptTerms', true); setDoc(null); }}>Tôi đồng ý</Button>}>
          {doc === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </Modal>
      )}
    </div>
  );
}
