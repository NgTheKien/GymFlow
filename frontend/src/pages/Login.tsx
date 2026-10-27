import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { AuthOptions, Role } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/Brand';
import { Icon, type IconName } from '../components/Icon';
import { Alert, Button, Field, PasswordInput } from '../components/ui';
import { errMsg, fieldErrs, useAsync } from '../lib/hooks';
import { SITE } from '../site';
import { ThemeToggle } from '../theme/ThemeToggle';
import { t } from '../i18n';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLE_ICON: Record<Role, IconName> = { ADMIN: 'shield', TRAINER: 'badge', MEMBER: 'user' };

export function AuthArt({ title, lines }: { title?: [string, string]; lines?: { icon: IconName; text: string }[] }) {
  const [a, b] = title ?? ['Tập có kế hoạch.', 'Tiến bộ đo được.'];
  const list = lines ?? [
    { icon: 'calendar', text: 'Lịch tập tuần với huấn luyện viên riêng' },
    { icon: 'chart', text: 'Cân nặng, BMI và chuyên cần hiển thị rõ ràng' },
    { icon: 'ticket', text: 'Gói tập minh bạch, nhắc gia hạn trước 7 ngày' },
  ];
  return (
    <div className="auth-art">
      <div className="slashes"><i /><i /><i /></div>
      <div className="auth-art-word" aria-hidden>MOVE</div>
      <Link to="/" className="row" style={{ gap: 10, position: 'relative', width: 'fit-content' }}>
        <BrandMark /><span className="brand-name">Gym<b>Flow</b></span>
      </Link>
      <div style={{ position: 'relative' }}>
        <h1 className="display">{t(a)}<br /><span className="grad-text">{t(b)}</span></h1>
        <div className="feature-list mt-24">
          {list.map((l) => <div key={l.text}><Icon name={l.icon} />{t(l.text)}</div>)}
        </div>
      </div>
      <div className="faint small" style={{ position: 'relative' }}>{t(SITE.openingHours)}</div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; registered?: string } | null;
  const from = state?.from ?? '/dashboard';
  const [email, setEmail] = useState(state?.registered ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const options = useAsync(() => api.get<AuthOptions>('/auth/options'), []);

  const submit = async (e?: FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    if (inFlight.current) return; // chặn bấm liên tiếp trước khi React kịp vẽ lại nút "đang tải"
    const em = (creds?.email ?? email).trim();
    const pw = creds?.password ?? password;
    const v: Record<string, string> = {};
    if (!em) v.email = 'Vui lòng nhập email';
    else if (!EMAIL_RE.test(em)) v.email = 'Email không hợp lệ';
    if (!pw) v.password = 'Vui lòng nhập mật khẩu';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await login(em, pw);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setErrors(fieldErrs(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const demo = options.data?.demoAccounts ?? [];
  const canRegister = options.data?.registrationEnabled ?? true;

  return (
    <div className="auth">
      <AuthArt />
      <div className="auth-form">
        <ThemeToggle className="auth-theme" />
        <form className="box stack page" onSubmit={submit} noValidate>
          <Link to="/" className="link small row" style={{ gap: 6, width: 'fit-content' }}><Icon name="arrowLeft" size={15} />{t('Trang chủ')}</Link>
          <div>
            <div className="kicker">{t('Hội viên & nhân viên')}</div>
            <h2>{t('Đăng nhập')}</h2>
            <p className="muted mt-8">{t('Chào mừng trở lại! Đăng nhập để xem lịch tập và tiến độ của bạn.')}</p>
          </div>
          {state?.registered && !error && <Alert kind="success">Tạo tài khoản thành công. Nhập mật khẩu vừa đặt để đăng nhập.</Alert>}
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Email" error={errors.email} required>
            <div className="input-icon">
              <Icon name="mail" />
              <input className={`input ${errors.email ? 'has-err' : ''}`} type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" aria-invalid={!!errors.email} />
            </div>
          </Field>
          <Field label="Mật khẩu" error={errors.password} required>
            <PasswordInput invalid={!!errors.password} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoFocus={!!state?.registered} />
          </Field>
          <div className="row between">
            <span />
            <Link to="/forgot-password" className="link small">{t('Quên mật khẩu?')}</Link>
          </div>
          <Button type="submit" variant="primary" size="lg" block loading={busy}>Đăng nhập</Button>

          {canRegister && (
            <p className="center small muted">{t('Chưa có tài khoản?')} <Link to="/register" className="link">{t('Đăng ký hội viên')}</Link></p>
          )}

          {demo.length > 0 && (
            <div className="demo-box">
              <div className="row between">
                <span className="tiny"><Icon name="zap" size={13} /> {t('Môi trường demo')}</span>
                <span className="tiny faint">{t('Dữ liệu mẫu, không phải tài khoản khách hàng')}</span>
              </div>
              <div className="quick-login">
                {demo.map((d) => (
                  <button key={d.email} type="button" disabled={busy}
                    onClick={() => { setEmail(d.email); setPassword(d.password); void submit(undefined, d); }}>
                    <Icon name={ROLE_ICON[d.role]} />{t(d.label)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {options.error && <p className="tiny faint center">{t('Không tải được cấu hình đăng nhập nhanh:')} {options.error}</p>}
        </form>
      </div>
    </div>
  );
}
