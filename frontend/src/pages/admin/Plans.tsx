import { useState } from 'react';
import { api } from '../../api/client';
import type { MembershipPlan } from '../../api/types';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { Alert, Badge, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, Textarea } from '../../components/ui';
import { durationLabel, fmtMoney } from '../../lib/format';
import { errMsg, fieldErrs, useAsync } from '../../lib/hooks';
import { t } from '../../i18n';

export default function Plans() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get<MembershipPlan[]>('/plans', { includeInactive: true }), []);
  const [editing, setEditing] = useState<MembershipPlan | 'new' | null>(null);
  const [removing, setRemoving] = useState<MembershipPlan | null>(null);

  const toggle = async (p: MembershipPlan) => {
    try { await api.put(`/plans/${p.id}/active`, { active: !p.active }); toast.success(p.active ? 'Đã ngừng bán gói' : 'Đã mở bán lại'); void reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="page">
      <PageHead eyebrow="Kinh doanh" title="Gói tập" desc="Đổi giá không ảnh hưởng gói đã bán (số tiền thực thu lưu riêng). Gói đã có người mua chỉ ngừng bán, không xoá."
        actions={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Thêm gói</Button>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <LoadingBlock rows={6} /> : data.length === 0 ? <Card><Empty icon="ticket" title="Chưa có gói tập" /></Card> : (
        <div className="grid grid-3">
          {data.map((p) => (
            <Card key={p.id} className={`price-card hoverable`}>
              <div className="row between">
                <span className="muted small">{durationLabel(p.durationDays)} · {t('{n} ngày', { n: p.durationDays })}</span>
                {p.active ? <Badge tone="green">Đang bán</Badge> : <Badge tone="muted">Ngừng bán</Badge>}
              </div>
              <h3 style={{ fontSize: 19 }}>{p.name}</h3>
              <div className="price">{fmtMoney(p.price)}</div>
              <div className="tiny faint">{t('≈ {v}/ngày', { v: fmtMoney(Math.round(p.price / p.durationDays)) })}</div>
              {p.description && <p className="small muted">{p.description}</p>}
              {p.benefits && <div className="stack-sm small">{p.benefits.split(/[,\n]/).map((b) => b.trim()).filter(Boolean).map((b) => <div key={b} className="row" style={{ gap: 8 }}><Icon name="check" size={14} className="ok" />{b}</div>)}</div>}
              <div className="divider" />
              <div className="row between">
                <span className="small"><b className="num">{p.currentSubscriptions}</b> <span className="muted">{t('đang dùng')}</span></span>
                <div className="row" style={{ gap: 2 }}>
                  <Button size="sm" variant="ghost" icon="edit" aria-label="Sửa" onClick={() => setEditing(p)} />
                  <Button size="sm" variant="ghost" icon={p.active ? 'ban' : 'play'} aria-label={p.active ? 'Ngừng bán' : 'Mở bán'} title={p.active ? 'Ngừng bán' : 'Mở bán'} onClick={() => void toggle(p)} />
                  <Button size="sm" variant="ghost" icon="trash" aria-label="Xoá" onClick={() => setRemoving(p)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <PlanForm plan={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
      {removing && <Confirm danger title="Xoá gói tập?" confirmText="Xoá" onClose={() => setRemoving(null)}
        message={t('Chỉ xoá được gói chưa từng bán. Nếu "{name}" đã có người đăng ký, hãy chọn Ngừng bán.', { name: removing.name })}
        onConfirm={async () => { try { await api.del(`/plans/${removing.id}`); toast.success('Đã xoá gói'); void reload(); } catch (e) { toast.error(errMsg(e)); throw e; } }} />}
    </div>
  );
}

function PlanForm({ plan, onClose, onSaved }: { plan?: MembershipPlan; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: plan?.name ?? '', description: plan?.description ?? '', price: String(plan?.price ?? ''), durationDays: String(plan?.durationDays ?? 30), benefits: plan?.benefits ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const v: Record<string, string> = {};
    const price = Number(f.price); const days = Number(f.durationDays);
    if (!f.name.trim()) v.name = 'Nhập tên gói';
    if (f.price === '' || !Number.isFinite(price) || price < 0) v.price = 'Giá không hợp lệ';
    if (!Number.isInteger(days) || days < 1 || days > 1095) v.durationDays = 'Từ 1 đến 1095 ngày';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    const body = { ...f, name: f.name.trim(), price, durationDays: days };
    try {
      if (plan) await api.put(`/plans/${plan.id}`, body); else await api.post('/plans', body);
      toast.success('Đã lưu gói tập'); onSaved();
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={plan ? 'Sửa gói tập' : 'Thêm gói tập'} onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {plan && plan.currentSubscriptions > 0 && <Alert kind="info">{t('{n} hội viên đang dùng gói này. Giá mới chỉ áp dụng cho lần đăng ký sau.', { n: plan.currentSubscriptions })}</Alert>}
        <div className="form-grid">
          <Field label="Tên gói" error={errors.name} required className="span-2"><Input maxLength={100} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Giá (₫)" error={errors.price} required hint={f.price ? fmtMoney(Number(f.price)) : undefined}><Input type="number" min={0} step={10000} value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label="Thời hạn (ngày)" error={errors.durationDays} required hint={Number(f.durationDays) > 0 ? durationLabel(Number(f.durationDays)) : undefined}>
            <Input type="number" min={1} max={1095} value={f.durationDays} onChange={(e) => set('durationDays', e.target.value)} />
          </Field>
          <Field label="Mô tả" className="span-2"><Textarea maxLength={500} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Quyền lợi" hint="Ngăn cách bằng dấu phẩy" className="span-2"><Textarea maxLength={1000} value={f.benefits} onChange={(e) => set('benefits', e.target.value)} placeholder="Tủ đồ, nước uống, 1 buổi PT" /></Field>
        </div>
      </div>
    </Modal>
  );
}
