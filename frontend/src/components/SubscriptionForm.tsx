import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Member, MembershipPlan, Page, Subscription, SubscriptionPreview } from '../api/types';
import { t, tn } from '../i18n';
import { durationLabel, fmtDate, fmtMoney } from '../lib/format';
import { errMsg, useAsync } from '../lib/hooks';
import { useToast } from './Toast';
import { Alert, Button, Field, Input, Modal, Select, Textarea } from './ui';

/** Đăng ký / gia hạn gói. Để trống ngày bắt đầu → nối tiếp ngay sau gói hiện tại. */
export function SubscriptionForm({ memberId: preset, onClose, onSaved }: { memberId?: number; onClose: () => void; onSaved: (s: Subscription) => void }) {
  const toast = useToast();
  const [memberId, setMemberId] = useState(preset ? String(preset) : '');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<SubscriptionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const members = useAsync(() => (preset ? Promise.resolve(null) : api.get<Page<Member>>('/members', { size: 200 })), []);
  const plans = useAsync(() => api.get<MembershipPlan[]>('/plans'), []);
  const plan = plans.data?.find((p) => String(p.id) === planId);

  useEffect(() => {
    setPreview(null);
    if (!memberId || !planId) return;
    let alive = true;
    api.get<SubscriptionPreview>('/subscriptions/preview', { memberId, planId, startDate: startDate || undefined })
      .then((p) => { if (alive) { setPreview(p); setPrice((cur) => (cur === '' ? String(p.price) : cur)); } })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [memberId, planId, startDate]);

  const submit = async () => {
    if (!memberId || !planId) { setError('Chọn hội viên và gói tập'); return; }
    const p = price === '' ? null : Number(price);
    if (p != null && (!Number.isFinite(p) || p < 0)) { setError('Số tiền không hợp lệ'); return; }
    setBusy(true); setError(null);
    try {
      const s = await api.post<Subscription>('/subscriptions', { memberId: Number(memberId), planId: Number(planId), startDate: startDate || null, pricePaid: p, note: note || null });
      toast.success(t('Đã đăng ký {plan} cho {member}', { plan: s.planName, member: s.memberName }));
      onSaved(s);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title="Đăng ký / gia hạn gói" onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Xác nhận thu tiền</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          {!preset && (
            <Field label="Hội viên" required className="span-2">
              <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">{t('— Chọn hội viên —')}</option>
                {members.data?.content.map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.code}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Gói tập" required className="span-2">
            <Select value={planId} onChange={(e) => { setPlanId(e.target.value); setPrice(''); }}>
              <option value="">{t('— Chọn gói —')}</option>
              {plans.data?.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} · {durationLabel(p.durationDays)} · {fmtMoney(p.price)}</option>)}
            </Select>
          </Field>
          <Field label="Ngày bắt đầu" hint="Để trống để nối tiếp gói hiện tại"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Số tiền thu (₫)" hint={plan ? t('Giá niêm yết {price}', { price: fmtMoney(plan.price) }) : undefined}><Input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Ghi chú" className="span-2"><Textarea maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: chuyển khoản, giảm 10% sinh viên" /></Field>
        </div>
        {preview && (
          <Alert kind={preview.chained ? 'info' : 'success'}>
            {tn('Hiệu lực {from} → {to}', { from: <b>{fmtDate(preview.startDate)}</b>, to: <b>{fmtDate(preview.endDate)}</b> })}
            {preview.chained && t(' · nối tiếp ngay sau gói hiện tại')}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
