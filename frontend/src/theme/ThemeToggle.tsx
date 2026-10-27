import type { IconName } from '../components/Icon';
import { Icon } from '../components/Icon';
import { useTheme, type ThemeChoice } from './ThemeContext';

const OPTIONS: { value: ThemeChoice; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Giao diện sáng' },
  { value: 'dark', icon: 'moon', label: 'Giao diện tối' },
  { value: 'system', icon: 'monitor', label: 'Theo hệ thống' },
];

/** Ba nút Sáng / Tối / Theo hệ thống – dùng ở header trang công khai và topbar ứng dụng. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { choice, setChoice } = useTheme();
  return (
    <div className={`theme-toggle ${className}`} role="radiogroup" aria-label="Chế độ giao diện">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={choice === o.value}
          aria-label={o.label} title={o.label} className={choice === o.value ? 'on' : ''}
          onClick={() => setChoice(o.value)}>
          <Icon name={o.icon} size={15} />
        </button>
      ))}
    </div>
  );
}
