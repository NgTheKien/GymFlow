import { useId } from 'react';
import { Icon } from '../components/Icon';
import { t, useLang, type Lang } from '../i18n';
import { useTheme } from './ThemeContext';

const LANGS: { value: Lang; short: string; label: string }[] = [
  { value: 'vi', short: 'VI', label: 'Tiếng Việt' },
  { value: 'en', short: 'EN', label: 'English' },
];

// 8 tia nắng quanh tâm (16, 16), bán kính 11 → 14
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => [16 + r * Math.cos(a), 16 + r * Math.sin(a)].map((n) => n.toFixed(2));
  const [x1, y1] = p(11);
  const [x2, y2] = p(14);
  return { x1, y1, x2, y2 };
});

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
 * Mặt trời ⇄ trăng khuyết: tia nắng xoay và thu lại, một vầng tối trượt vào khoét mặt trời thành trăng.
 * Lấy cảm hứng từ các nút của toggles.dev, vẽ lại bằng SVG thuần, không thêm thư viện.
 */
function SunMoon() {
  // useId trả ":r0:" – bỏ dấu ":" để url(#…) chạy đúng trên mọi trình duyệt
  const mask = `tt-mask-${useId().replace(/:/g, '')}`;
  return (
    <svg className="tt-icon" viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <mask id={mask}>
        <rect width="32" height="32" fill="#fff" />
        <circle className="tt-cut" cx="31" cy="1" r="8.5" fill="#000" />
      </mask>
      <circle className="tt-core" cx="16" cy="16" r="9" fill="currentColor" mask={`url(#${mask})`} />
      <g className="tt-rays" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {RAYS.map((r, i) => <line key={i} {...r} />)}
      </g>
    </svg>
  );
}

/**
 * Ngôn ngữ + nút Sáng/Tối có hiệu ứng + nút Theo hệ thống – dùng ở header trang công khai, form đăng nhập và topbar ứng dụng.
 * Bấm nút Sáng/Tối luôn chuyển sang chế độ đối diện với chế độ đang hiển thị (kể cả khi đang theo hệ thống).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { choice, theme, setChoice } = useTheme();
  const dark = theme === 'dark';
  const system = choice === 'system';
  return (
    <div className={`prefs ${className}`}>
      <LangToggle />
      <div className="theme-toggle" role="group" aria-label={t('Chế độ giao diện')}>
        <button type="button" role="switch" aria-checked={dark} className={`tt ${dark ? 'is-dark' : ''}`}
          aria-label={t('Giao diện tối')} title={t(dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối')}
          onClick={() => setChoice(dark ? 'light' : 'dark')}>
          <SunMoon />
        </button>
        <button type="button" aria-pressed={system} className={system ? 'on' : ''}
          aria-label={t('Theo hệ thống')} title={t('Theo hệ thống')}
          onClick={() => setChoice(system ? theme : 'system')}>
          <Icon name="monitor" size={15} />
        </button>
      </div>
    </div>
  );
}
