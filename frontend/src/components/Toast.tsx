import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { Icon } from './Icon';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; text: string }
interface ToastApi { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void }

const Ctx = createContext<ToastApi | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++seq;
    setItems((xs) => [...xs.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3800);
  }, []);
  const [api] = useState<ToastApi>(() => ({
    success: (t) => push('success', t), error: (t) => push('error', t), info: (t) => push('info', t),
  }));
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.kind}`}>
            <Icon name={item.kind === 'success' ? 'checkCircle' : item.kind === 'error' ? 'alert' : 'info'} />
            <div className="grow">{t(item.text)}</div>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label={t('Đóng')} onClick={() => setItems((xs) => xs.filter((x) => x.id !== item.id))}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast phải nằm trong ToastProvider');
  return c;
}
