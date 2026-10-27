import type { Gender, Level, MemberStatus, MuscleGroup, PlanStatus, Role, ScheduleStatus, SubscriptionState, UserStatus } from '../api/types';

export type Tone = 'green' | 'blue' | 'violet' | 'amber' | 'red' | 'muted';

export const roleLabel: Record<Role, string> = { ADMIN: 'Quản lý', TRAINER: 'Huấn luyện viên', MEMBER: 'Hội viên' };
export const genderLabel: Record<Gender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
export const memberStatus: Record<MemberStatus, [string, Tone]> = {
  ACTIVE: ['Hoạt động', 'green'], PAUSED: ['Bảo lưu', 'amber'], INACTIVE: ['Ngừng', 'muted'],
};
export const userStatus: Record<UserStatus, [string, Tone]> = { ACTIVE: ['Đang mở', 'green'], LOCKED: ['Đã khoá', 'red'] };
export const subState: Record<SubscriptionState, [string, Tone]> = {
  UPCOMING: ['Sắp bắt đầu', 'blue'], ACTIVE: ['Còn hiệu lực', 'green'], EXPIRING: ['Sắp hết hạn', 'amber'],
  EXPIRED: ['Hết hạn', 'red'], CANCELLED: ['Đã huỷ', 'muted'],
};
export const scheduleStatus: Record<ScheduleStatus, [string, Tone]> = {
  SCHEDULED: ['Đã lên lịch', 'blue'], COMPLETED: ['Hoàn thành', 'green'], MISSED: ['Vắng', 'red'], CANCELLED: ['Đã huỷ', 'muted'],
};
export const planStatus: Record<PlanStatus, [string, Tone]> = {
  ACTIVE: ['Đang áp dụng', 'green'], COMPLETED: ['Hoàn thành', 'blue'], ARCHIVED: ['Lưu trữ', 'muted'],
};
export const muscleLabel: Record<MuscleGroup, string> = {
  CHEST: 'Ngực', BACK: 'Lưng', LEGS: 'Chân', SHOULDERS: 'Vai', ARMS: 'Tay', CORE: 'Bụng – core', CARDIO: 'Cardio', FULL_BODY: 'Toàn thân',
};
export const muscleColor: Record<MuscleGroup, string> = {
  CHEST: '#ff6b61', BACK: '#3d97ff', LEGS: '#00d95b', SHOULDERS: '#ffb020', ARMS: '#8b7cff', CORE: '#00c2ff', CARDIO: '#ff4fa3', FULL_BODY: '#c4f04a',
};
export const levelLabel: Record<Level, [string, Tone]> = {
  BEGINNER: ['Cơ bản', 'green'], INTERMEDIATE: ['Trung cấp', 'blue'], ADVANCED: ['Nâng cao', 'violet'],
};
export const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const DAY_NAMES = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];

export const actionLabel: Record<string, string> = {
  LOGIN: 'Đăng nhập', LOGIN_FAILED: 'Đăng nhập thất bại', PASSWORD_CHANGE: 'Đổi mật khẩu', PASSWORD_RESET_REQUEST: 'Yêu cầu khôi phục',
  PASSWORD_RESET: 'Đặt lại mật khẩu', PROFILE_UPDATE: 'Sửa hồ sơ', USER_CREATE: 'Tạo tài khoản', USER_LOCK: 'Khoá tài khoản',
  USER_UNLOCK: 'Mở khoá tài khoản', USER_RESET_PASSWORD: 'Cấp mật khẩu tạm', MEMBER_CREATE: 'Thêm hội viên', MEMBER_UPDATE: 'Sửa hội viên',
  MEMBER_SELF_UPDATE: 'Hội viên sửa hồ sơ', MEMBER_STATUS: 'Đổi trạng thái hội viên', MEMBER_ASSIGN_TRAINER: 'Phân công HLV',
  TRAINER_CREATE: 'Thêm HLV', TRAINER_UPDATE: 'Sửa HLV', TRAINER_ACTIVATE: 'Kích hoạt HLV', TRAINER_DEACTIVATE: 'Ngừng HLV', TRAINER_SHIFTS: 'Cập nhật ca làm',
  PLAN_CREATE: 'Thêm gói tập', PLAN_UPDATE: 'Sửa gói tập', PLAN_ACTIVATE: 'Mở bán gói', PLAN_DEACTIVATE: 'Ngừng bán gói', PLAN_DELETE: 'Xoá gói tập',
  SUBSCRIPTION_CREATE: 'Đăng ký gói', SUBSCRIPTION_RENEW: 'Gia hạn gói', SUBSCRIPTION_CANCEL: 'Huỷ gói',
  EXERCISE_CREATE: 'Thêm bài tập', EXERCISE_UPDATE: 'Sửa bài tập', EXERCISE_HIDE: 'Ẩn bài tập', EXERCISE_SHOW: 'Hiện bài tập', EXERCISE_DELETE: 'Xoá bài tập',
  WORKOUT_PLAN_CREATE: 'Tạo giáo án', WORKOUT_PLAN_UPDATE: 'Sửa giáo án', WORKOUT_PLAN_STATUS: 'Đổi trạng thái giáo án', WORKOUT_PLAN_DELETE: 'Xoá giáo án',
  SCHEDULE_CREATE: 'Xếp lịch', SCHEDULE_UPDATE: 'Dời lịch', SCHEDULE_CANCEL: 'Huỷ buổi', SCHEDULE_MISSED: 'Đánh vắng', SCHEDULE_COMPLETE: 'Hoàn thành buổi',
  SCHEDULE_AUTO_MISSED: 'Tự đánh vắng', WEIGHT_CREATE: 'Ghi cân nặng', WEIGHT_UPDATE: 'Sửa cân nặng', WEIGHT_DELETE: 'Xoá cân nặng', SYSTEM_SEED: 'Khởi tạo dữ liệu',
};

// ---------- Ngày giờ (backend trả giờ địa phương không kèm múi giờ) ----------
const pad = (n: number) => String(n).padStart(2, '0');
export const parseDate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const parseDateTime = (s: string) => {
  const [date, time = '00:00:00'] = s.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map((x) => Number(x.slice(0, 2)));
  return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);
};
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toIsoDateTime = (d: Date) => `${toIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
export const todayIso = () => toIsoDate(new Date());
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (x.getDay() + 6) % 7; return addDays(x, -dow); };
export const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const fmtDate = (s: string | null | undefined) => (s ? parseDate(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
export const fmtDateShort = (s: string) => parseDate(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
export const fmtTime = (s: string) => { const d = parseDateTime(s); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDateTime = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = parseDateTime(s);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};
export const fmtWeekday = (s: string) => parseDateTime(s).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
export const relativeTime = (s: string) => {
  const diff = (Date.now() - parseDateTime(s).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`;
  return fmtDateTime(s);
};
export const age = (dob: string | null) => {
  if (!dob) return null;
  const d = parseDate(dob); const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
};

// ---------- Số ----------
export const fmtMoney = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('vi-VN') + ' ₫');
export const fmtMoneyShort = (n: number) => {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr';
  if (Math.abs(n) >= 1e3) return Math.round(n / 1e3) + 'k';
  return String(n);
};
export const fmtNum = (n: number | null | undefined, digits = 0) => (n == null ? '—' : n.toLocaleString('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: 0 }));
export const pctChange = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10);
export const durationLabel = (days: number) => (days % 365 === 0 ? `${days / 365} năm` : days % 30 === 0 ? `${days / 30} tháng` : `${days} ngày`);
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts.length > 1 ? parts[parts.length - 2][0] : '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};
export const hueOf = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
