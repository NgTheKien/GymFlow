import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { locale, t, tx } from '../i18n';
import { hueOf, initials, type Tone } from '../lib/format';
import { Icon, type IconName } from './Icon';

// ---------- Button ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'info';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: IconName; loading?: boolean; block?: boolean;
}
export function Button({ variant = 'secondary', size = 'md', icon, loading, block, children, className = '', disabled, type = 'button', title, ...rest }: ButtonProps) {
  const label = rest['aria-label'];
  const cls = ['btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, !children && 'btn-icon', block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest} aria-label={label ? t(label) : undefined} title={title ? t(title) : undefined}>
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} />}
      {children && <span>{tx(children)}</span>}
    </button>
  );
}

// ---------- Badge ----------
export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{tx(children)}</span>;
}
export function StatusBadge({ map, value }: { map: Record<string, [string, Tone]>; value: string | null | undefined }) {
  if (!value) return <span className="faint">—</span>;
  const [label, tone] = map[value] ?? [value, 'muted' as Tone];
  return <Badge tone={tone}>{label}</Badge>;
}

// ---------- Avatar / Person ----------
export function Avatar({ name, size }: { name: string; size?: 'sm' | 'lg' }) {
  return <div className={`avatar ${size ?? ''}`} style={{ ['--h' as string]: hueOf(name) }} aria-hidden>{initials(name)}</div>;
}
export function Person({ name, sub, size }: { name: string; sub?: ReactNode; size?: 'sm' | 'lg' }) {
  return (
    <div className="person">
      <Avatar name={name} size={size} />
      <div style={{ minWidth: 0 }}>
        <div className="name">{name}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}

// ---------- Card / Stat ----------
export function Card({ title, icon, actions, children, flush, className = '' }: { title?: ReactNode; icon?: IconName; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={`card ${flush ? 'card-flush' : ''} ${className}`}>
      {(title || actions) && (
        <div className="card-title">
          <h3>{icon && <Icon name={icon} />}{tx(title)}</h3>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, foot, icon, accent }: { label: string; value: ReactNode; unit?: string; foot?: ReactNode; icon: IconName; accent?: string }) {
  return (
    <div className="stat" style={accent ? { ['--accent' as string]: accent } : undefined}>
      <div className="label"><Icon name={icon} />{t(label)}</div>
      <div className="value">{value}{unit && <small>{t(unit)}</small>}</div>
      {foot && <div className="foot">{tx(foot)}</div>}
    </div>
  );
}

/** Đếm số lên khi xuất hiện (hiệu ứng nhẹ cho thẻ số liệu). */
export function CountUp({ value, format = (n) => n.toLocaleString(locale()) }: { value: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return; }
    let raf = 0; const start = performance.now(); const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Number.isInteger(value) ? Math.round(n) : Math.round(n * 10) / 10)}</>;
}

// ---------- Page header ----------
export function PageHead({ eyebrow, title, desc, actions }: { eyebrow?: string; title: ReactNode; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{t(eyebrow)}</div>}
        <h1>{tx(title)}</h1>
        {desc && <p>{tx(desc)}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

// ---------- Form controls ----------
export function Field({ label, error, hint, required, children, className = '' }: { label?: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{t(label)}{required && <span className="req">*</span>}</label>}
      {children}
      {error ? <div className="err">{t(error)}</div> : hint ? <div className="hint">{t(hint)}</div> : null}
    </div>
  );
}
export function Input({ invalid, className = '', placeholder, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? 'has-err' : ''} ${className}`} placeholder={placeholder ? t(placeholder) : undefined} {...rest} />;
}
export function Select({ invalid, className = '', children, 'aria-label': ariaLabel, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select className={`select ${invalid ? 'has-err' : ''} ${className}`} aria-label={ariaLabel ? t(ariaLabel) : undefined} {...rest}>{children}</select>;
}
export function Textarea({ invalid, className = '', placeholder, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`textarea ${invalid ? 'has-err' : ''} ${className}`} placeholder={placeholder ? t(placeholder) : undefined} {...rest} />;
}
export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="input-icon">
      <Icon name="search" />
      <input className="input" value={value} placeholder={t(placeholder)} onChange={(e) => onChange(e.target.value)} aria-label={t(placeholder)} />
    </div>
  );
}
export function PasswordInput({ invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-icon">
      <Icon name="lock" />
      <input className={`input ${invalid ? 'has-err' : ''}`} type={show ? 'text' : 'password'} style={{ paddingRight: 44 }} {...rest} />
      <button type="button" className="btn btn-ghost btn-sm btn-icon eye" onClick={() => setShow((s) => !s)} aria-label={t(show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}>
        <Icon name={show ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{t(o.label)}</button>
      ))}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, children, footer, size }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'wide' | 'medium' | 'narrow' }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  // Vẽ thẳng vào <body>: nếu nằm trong phần tử cha có transform/animation (VD .page), position: fixed sẽ bám theo
  // phần tử cha thay vì màn hình → khung bị đẩy xuống dưới, mất nút Lưu, người dùng phải thu nhỏ trình duyệt mới thấy.
  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true" ref={ref}>
        <div className="modal-head">
          <h2>{tx(title)}</h2>
          <Button variant="ghost" size="sm" icon="x" aria-label="Đóng" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({ title, message, confirmText = 'Xác nhận', danger, onConfirm, onClose }: { title: string; message: ReactNode; confirmText?: string; danger?: boolean; onConfirm: () => Promise<void> | void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={t(title)} onClose={onClose} size="narrow" footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } catch { /* lỗi đã được báo bằng toast */ } finally { setBusy(false); } }}>{t(confirmText)}</Button>
    </>}>
      <div className="muted">{tx(message)}</div>
    </Modal>
  );
}

// ---------- Empty / loading / error ----------
export function Empty({ icon = 'layers', title, desc, action }: { icon?: IconName; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h4>{t(title)}</h4>
      {desc && <p className="small">{t(desc)}</p>}
      {action}
    </div>
  );
}
export function Skeleton({ h = 18, w = '100%', r }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}
export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div className="stack">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={i === 0 ? 28 : 18} w={i === 0 ? '40%' : `${90 - i * 8}%`} />)}</div>;
}
export function Alert({ kind = 'info', children, action }: { kind?: 'info' | 'warning' | 'error' | 'success'; children: ReactNode; action?: ReactNode }) {
  const icon: IconName = kind === 'success' ? 'checkCircle' : kind === 'info' ? 'info' : 'alert';
  return <div className={`alert ${kind}`}><Icon name={icon} /><div className="grow">{tx(children)}</div>{action}</div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Alert kind="error" action={onRetry && <Button size="sm" icon="refresh" onClick={onRetry}>Thử lại</Button>}>{t(message)}</Alert>;
}

export function Meter({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return <div className="meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%`, ['--c' as string]: color }} /></div>;
}

/** Các số trang cần hiện: luôn có trang đầu, trang cuối và 1 trang mỗi bên trang hiện tại; khoảng trống = null (…). */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const keep = new Set([0, totalPages - 1, page - 1, page, page + 1]);
  const out: (number | null)[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (keep.has(i)) out.push(i);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}

/**
 * Thanh phân trang. page tính từ 0. Truyền size + sizes + onSize để cho chọn số dòng mỗi trang.
 * Dùng chung cho phân trang phía server (Page<T>) và phía client (usePaged).
 */
export function Pager({ page, totalPages, total, onPage, size, sizes, onSize }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void;
  size?: number; sizes?: number[]; onSize?: (s: number) => void;
}) {
  const sizePicker = size && sizes && onSize && total > Math.min(...sizes) && (
    <label className="pager-size">
      <span>{t('Hiển thị')}</span>
      <select className="select select-sm" value={size} onChange={(e) => onSize(Number(e.target.value))} aria-label={t('Số dòng mỗi trang')}>
        {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
  if (totalPages <= 1) return <div className="pager"><span>{t('{n} bản ghi', { n: total })}</span>{sizePicker}</div>;
  const from = size ? page * size + 1 : null;
  const to = size ? Math.min(total, (page + 1) * size) : null;
  return (
    <nav className="pager" aria-label={t('Phân trang')}>
      <span>{from ? t('{a}–{b} trên {n} bản ghi', { a: from, b: to ?? total, n: total }) : t('{n} bản ghi · trang {p}/{tp}', { n: total, p: page + 1, tp: totalPages })}</span>
      <div className="row row-wrap" style={{ gap: 4 }}>
        {sizePicker}
        <Button size="sm" icon="chevronLeft" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Trang trước" />
        {pageWindow(page, totalPages).map((p, i) => p === null
          ? <span key={`gap${i}`} className="pager-gap" aria-hidden>…</span>
          : <button key={p} type="button" className={`pager-num ${p === page ? 'on' : ''}`} aria-current={p === page ? 'page' : undefined}
              aria-label={t('Trang {p}', { p: p + 1 })} onClick={() => onPage(p)}>{p + 1}</button>)}
        <Button size="sm" icon="chevronRight" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} aria-label="Trang sau" />
      </div>
    </nav>
  );
}

export function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="faint">—</span>;
  return <span className="row" style={{ gap: 2, color: 'var(--warning)' }} aria-label={t('{n}/5 sao', { n: value })}>{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={14} fill={i < value ? 'currentColor' : 'none'} />)}</span>;
}
