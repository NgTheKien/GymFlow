import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Lựa chọn của người dùng; "system" đi theo cài đặt hệ điều hành. */
export type ThemeChoice = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'gf.theme';
const QUERY = '(prefers-color-scheme: light)';
// Phải trùng --canvas của từng chế độ trong styles.css (thanh địa chỉ trên mobile)
const META_COLOR: Record<Theme, string> = { dark: '#141415', light: '#f5f6f8' };

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

const systemTheme = (): Theme => (window.matchMedia?.(QUERY).matches ? 'light' : 'dark');

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme]);
}

interface ThemeValue { choice: ThemeChoice; theme: Theme; setChoice: (c: ThemeChoice) => void }

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme: Theme = choice === 'system' ? system : choice;

  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Đồng bộ khi đổi ở tab khác
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) setChoiceState(readChoice()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => { apply(theme); }, [theme]);

  const setChoice = useCallback((c: ThemeChoice) => {
    const root = document.documentElement;
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-anim');
      window.setTimeout(() => root.classList.remove('theme-anim'), 300);
    }
    setChoiceState(c);
    try { localStorage.setItem(THEME_KEY, c); } catch { /* chế độ riêng tư: chỉ áp dụng trong phiên */ }
  }, []);

  const value = useMemo(() => ({ choice, theme, setChoice }), [choice, theme, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme phải nằm trong ThemeProvider');
  return v;
}
