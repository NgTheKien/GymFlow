import type { IconName } from '../components/Icon';
import { Icon } from '../components/Icon';
import { t, useLang, type Lang } from '../i18n';
import { useTheme, type ThemeChoice } from './ThemeContext';

const OPTIONS: { value: ThemeChoice; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Giao diện sáng' },
  { value: 'dark', icon: 'moon', label: 'Giao diện tối' },
  { value: 'system', icon: 'monitor', label: 'Theo hệ thống' },
];

const LANGS: { value: Lang; short: string; label: string }[] = [
  { value: 'vi', short: 'VI', label: 'Tiếng Việt' },
  { value: 'en', short: 'EN', label: 'English' },
];

/** Chọn ngôn ngữ Tiếng Việt / English; tên ngôn ngữ luôn viết bằng chính ngôn ngữ đó. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="theme-toggle lang-toggle" role="radiogroup" aria-label={t('Ngôn ngữ')}>
      {LANGS.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={lang === o.value} lang={o.value}
          aria-label={o.label} title={o.label} className={lang === o.value ? 'on' : ''}
          onClick={() => { if (lang !== o.value) setLang(o.value); }}>
          {o.short}
        </button>
      ))}
    </div>
  );
}

/**
 * Ngôn ngữ + Sáng / Tối / Theo hệ thống – dùng ở header trang công khai, form đăng nhập và topbar ứng dụng.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { choice, setChoice } = useTheme();
  return (
    <div className={`prefs ${className}`}>
      <LangToggle />
      <div className="theme-toggle" role="radiogroup" aria-label={t('Chế độ giao diện')}>
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={choice === o.value}
            aria-label={t(o.label)} title={t(o.label)} className={choice === o.value ? 'on' : ''}
            onClick={() => setChoice(o.value)}>
            <Icon name={o.icon} size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
