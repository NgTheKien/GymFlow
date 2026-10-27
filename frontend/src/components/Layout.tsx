import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Notification, Role } from '../api/types';
import { useMe, useAuth } from '../auth/AuthContext';
import { relativeTime, roleLabel } from '../lib/format';
import { Brand } from './Brand';
import { Icon, type IconName } from './Icon';
import { Avatar, Button } from './ui';
import { ThemeToggle } from '../theme/ThemeToggle';

interface NavItem { to: string; label: string; icon: IconName; roles: Role[]; group?: string; tab?: boolean }

export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: 'dashboard', roles: ['ADMIN', 'TRAINER', 'MEMBER'], tab: true },
  { to: '/me/schedule', label: 'Lịch tập của tôi', icon: 'calendar', roles: ['MEMBER'], tab: true },
  { to: '/me/plan', label: 'Giáo án của tôi', icon: 'clipboard', roles: ['MEMBER'], tab: true },
  { to: '/me/progress', label: 'Tiến độ', icon: 'chart', roles: ['MEMBER'], tab: true },
  { to: '/me/packages', label: 'Gói tập của tôi', icon: 'ticket', roles: ['MEMBER'] },
  { to: '/schedules', label: 'Lịch tập', icon: 'calendar', roles: ['ADMIN', 'TRAINER'], tab: true },
  { to: '/members', label: 'Hội viên', icon: 'users', roles: ['ADMIN', 'TRAINER'], group: 'Huấn luyện', tab: true },
  { to: '/workout-plans', label: 'Giáo án', icon: 'clipboard', roles: ['ADMIN', 'TRAINER'], group: 'Huấn luyện', tab: true },
  { to: '/exercises', label: 'Thư viện bài tập', icon: 'dumbbell', roles: ['ADMIN', 'TRAINER', 'MEMBER'], group: 'Huấn luyện' },
  { to: '/trainers', label: 'Huấn luyện viên', icon: 'badge', roles: ['ADMIN'], group: 'Kinh doanh' },
  { to: '/plans', label: 'Gói tập', icon: 'ticket', roles: ['ADMIN'], group: 'Kinh doanh' },
  { to: '/subscriptions', label: 'Đăng ký gói', icon: 'card', roles: ['ADMIN'], group: 'Kinh doanh' },
  { to: '/reports', label: 'Báo cáo', icon: 'chart', roles: ['ADMIN'], group: 'Kinh doanh' },
  { to: '/users', label: 'Tài khoản & quyền', icon: 'userCog', roles: ['ADMIN'], group: 'Hệ thống' },
  { to: '/audit-logs', label: 'Nhật ký hệ thống', icon: 'scroll', roles: ['ADMIN'], group: 'Hệ thống' },
  { to: '/profile', label: 'Hồ sơ cá nhân', icon: 'user', roles: ['ADMIN', 'TRAINER', 'MEMBER'], group: 'Tài khoản' },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return (
    <div className="clock">
      <div className="num">{now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="tiny muted">{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
    </div>
  );
}

function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>(() => JSON.parse(sessionStorage.getItem('gf.seen') ?? '[]'));
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let alive = true;
    const load = () => api.get<Notification[]>('/notifications').then((x) => alive && setItems(x)).catch(() => undefined);
    void load();
    const t = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter((n) => !seen.includes(n.id)).length;
  const toggle = () => {
    setOpen((o) => !o);
    const ids = items.map((n) => n.id);
    setSeen(ids);
    sessionStorage.setItem('gf.seen', JSON.stringify(ids));
  };
  const icon = (l: Notification['level']): IconName => (l === 'danger' ? 'alert' : l === 'warning' ? 'clock' : 'info');

  return (
    <div className="bell" ref={ref}>
      <Button variant="ghost" icon="bell" aria-label={`Thông báo (${unread} mới)`} onClick={toggle} />
      {unread > 0 && <span className="dot">{unread}</span>}
      {open && (
        <div className="popover" role="menu">
          <div className="row between" style={{ padding: '6px 10px 10px' }}>
            <b>Thông báo</b><span className="tiny faint">{items.length} mục</span>
          </div>
          {items.length === 0 && <div className="empty" style={{ padding: 24 }}><Icon name="checkCircle" /><p className="small">Không có việc gì cần chú ý</p></div>}
          {items.map((n) => (
            <div key={n.id} className={`notif ${n.level}`} role="menuitem" tabIndex={0}
              onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && n.link) { setOpen(false); navigate(n.link); } }}>
              <div className="ic"><Icon name={icon(n.level)} /></div>
              <div className="grow">
                <div className="small" style={{ fontWeight: 700 }}>{n.title}</div>
                <div className="tiny muted">{n.message}</div>
                <div className="tiny faint mt-4">{relativeTime(n.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const user = useMe();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const current = items.find((n) => pathname === n.to || pathname.startsWith(n.to + '/'));
  const tabs = items.filter((n) => n.tab).slice(0, 4);
  let lastGroup: string | undefined;

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Điều hướng chính">
        <Link to="/dashboard"><Brand /></Link>
        <nav className="nav">
          {items.map((n) => {
            const showGroup = n.group && n.group !== lastGroup;
            lastGroup = n.group ?? lastGroup;
            return (
              <Fragment key={n.to}>
                {showGroup && <div className="nav-group">{n.group}</div>}
                <NavLink to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <Icon name={n.icon} /><span>{n.label}</span>
                </NavLink>
              </Fragment>
            );
          })}
        </nav>
        <div className="side-user">
          <Avatar name={user.fullName} />
          <div className="grow">
            <div>{user.fullName}</div>
            <div className="tiny faint">{roleLabel[user.role]}</div>
          </div>
          <Button variant="ghost" size="sm" icon="logout" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => { logout(); navigate('/login'); }} />
        </div>
      </aside>
      {open && <div className="mobile-scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <Button className="menu-btn" variant="ghost" icon="menu" aria-label="Mở menu" onClick={() => setOpen(true)} />
          <div className="crumb">GymFlow / <b>{current?.label ?? 'Chi tiết'}</b></div>
          <div className="spacer" />
          <Clock />
          <ThemeToggle className="top-theme" />
          <Notifications />
        </header>
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Điều hướng nhanh">
        {tabs.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={n.icon} /><span>{n.label.replace(' của tôi', '')}</span>
          </NavLink>
        ))}
        <a href="#menu" onClick={(e) => { e.preventDefault(); setOpen(true); }}><Icon name="more" /><span>Thêm</span></a>
      </nav>
    </div>
  );
}
