import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ForgotPasswordResponse, MessageResponse } from '../api/types';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { Alert, Button, Field, Input, PasswordInput } from '../components/ui';
import { errMsg, fieldErrs } from '../lib/hooks';
import { AuthArt } from './Login';
import { ThemeToggle } from '../theme/ThemeToggle';
import { t } from '../i18n';

const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export default function ForgotPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErrors({ email: 'Email không hợp lệ' }); return; }
    setBusy(true); setError(null); setErrors({});
    try {
      const res = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email: email.trim() });
      setDemoToken(res.resetToken);
      setMinutes(res.validMinutes);
      if (res.resetToken) setToken(res.resetToken);
      setStep(2);
      toast.info(res.message);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!token.trim()) v.token = 'Nhập mã khôi phục';
    if (!PW_RULE.test(pw)) v.newPassword = 'Tối thiểu 8 ký tự, gồm cả chữ và số';
    if (pw !== pw2) v.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setError(null);
    try {
      const res = await api.post<MessageResponse>('/auth/reset-password', { token: token.trim(), newPassword: pw });
      toast.success(res.message);
      navigate('/login');
    } catch (err) { setError(errMsg(err)); setErrors(fieldErrs(err)); } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <AuthArt />
      <div className="auth-form">
        <ThemeToggle className="auth-theme" />
        <div className="box stack page">
          <Link to="/login" className="link small row" style={{ gap: 6 }}><Icon name="arrowLeft" size={15} />{t('Quay lại đăng nhập')}</Link>
          <div>
            <h2>{t(step === 1 ? 'Quên mật khẩu' : 'Đặt mật khẩu mới')}</h2>
            <p className="muted mt-8">{step === 1 ? t('Nhập email tài khoản, hệ thống sẽ gửi mã khôi phục.') : t('Mã có hiệu lực trong {n} phút và chỉ dùng được một lần.', { n: minutes })}</p>
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          {step === 1 ? (
            <form className="stack" onSubmit={request} noValidate>
              <Field label="Email" error={errors.email} required>
                <Input type="email" value={email} invalid={!!errors.email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@gymflow.vn" />
              </Field>
              <Button type="submit" variant="primary" size="lg" block loading={busy}>Gửi mã khôi phục</Button>
            </form>
          ) : (
            <form className="stack" onSubmit={reset} noValidate>
              {demoToken && <Alert kind="info">{t('Chế độ demo (chưa gửi email thật): mã của bạn là')} <b className="num" style={{ letterSpacing: 2 }}>{demoToken}</b></Alert>}
              <Field label="Mã khôi phục" error={errors.token} required>
                <Input value={token} invalid={!!errors.token} onChange={(e) => setToken(e.target.value.toUpperCase())} placeholder="VD: K7M2QX9A" style={{ letterSpacing: 2 }} />
              </Field>
              <Field label="Mật khẩu mới" error={errors.newPassword} hint="Tối thiểu 8 ký tự, gồm chữ và số" required>
                <PasswordInput value={pw} invalid={!!errors.newPassword} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label="Nhập lại mật khẩu" error={errors.confirm} required>
                <PasswordInput value={pw2} invalid={!!errors.confirm} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              </Field>
              <Button type="submit" variant="primary" size="lg" block loading={busy}>Đặt lại mật khẩu</Button>
              <Button variant="ghost" onClick={() => setStep(1)}>Gửi lại mã</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
