import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
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
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === 'success' ? 'checkCircle' : t.kind === 'error' ? 'alert' : 'info'} />
            <div className="grow">{t.text}</div>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label="Đóng" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}>
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
