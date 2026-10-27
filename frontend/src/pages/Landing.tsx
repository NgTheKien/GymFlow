import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { MembershipPlan } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';
import { Icon, type IconName } from '../components/Icon';
import { Button } from '../components/ui';
import { durationLabel, fmtMoney } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { SITE } from '../site';

const DISCIPLINES = ['Thể hình', 'Giảm mỡ', 'Sức mạnh', 'Powerlifting', 'Yoga', 'Phục hồi', 'Cardio', 'PT 1 kèm 1'];

const PROGRAMS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'flame', title: 'Thể hình & giảm mỡ', desc: 'Giáo án theo tuần, kết hợp tạ và cardio, đo lại cân nặng – % mỡ định kỳ.' },
  { icon: 'dumbbell', title: 'Sức mạnh', desc: 'Squat, bench, deadlift đúng kỹ thuật, tăng tải có kiểm soát theo từng hiệp.' },
  { icon: 'heart', title: 'Yoga & phục hồi', desc: 'Mobility, giãn cơ và phục hồi chấn thương nhẹ cho người ngồi văn phòng.' },
  { icon: 'target', title: 'PT 1 kèm 1', desc: 'Huấn luyện viên riêng xếp lịch, soạn giáo án và theo sát từng buổi tập.' },
];

const BENEFITS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'calendar', title: 'Lịch tập của riêng bạn', desc: 'Xem buổi tiếp theo, giờ tập và huấn luyện viên phụ trách ngay trên điện thoại.' },
  { icon: 'clipboard', title: 'Giáo án cá nhân hoá', desc: 'Bài tập theo từng ngày: số hiệp, số lần, mức tạ và thời gian nghỉ.' },
  { icon: 'chart', title: 'Tiến độ đo được', desc: 'Biểu đồ cân nặng, BMI chuẩn châu Á, tỉ lệ chuyên cần và chuỗi tuần tập.' },
  { icon: 'ticket', title: 'Gói tập minh bạch', desc: 'Biết rõ ngày hết hạn, gia hạn nối tiếp không mất ngày, nhắc trước 7 ngày.' },
  { icon: 'bell', title: 'Nhắc lịch kịp thời', desc: 'Thông báo buổi tập hôm nay, gói sắp hết hạn và nhắc cập nhật cân nặng.' },
  { icon: 'trophy', title: 'Ghi nhận mỗi buổi tập', desc: 'Đánh dấu hoàn thành, ghi thời lượng, calo và cảm nhận sau buổi tập.' },
];

const STEPS = [
  { title: 'Tạo tài khoản', desc: 'Đăng ký hội viên trực tuyến miễn phí, chỉ cần họ tên và email.' },
  { title: 'Chọn gói tại quầy', desc: 'Thanh toán gói phù hợp, lễ tân kích hoạt ngay trên tài khoản của bạn.' },
  { title: 'Bắt đầu tập', desc: 'Huấn luyện viên xếp lịch, soạn giáo án – bạn chỉ việc đến và tập.' },
];

export default function Landing() {
  const { user } = useAuth();
  const plans = useAsync(() => api.get<MembershipPlan[]>('/plans/public'), []);
  const best = plans.data && plans.data.length > 2 ? plans.data[1].id : null;
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menu]);

  const primaryCta = user
    ? <Link className="btn btn-primary btn-lg" to="/dashboard"><span>Vào trang của tôi</span><Icon name="arrowRight" /></Link>
    : <Link className="btn btn-primary btn-lg" to="/register"><span>Đăng ký hội viên</span><Icon name="arrowRight" /></Link>;

  return (
    <div className="public">
      <nav className="landing-nav">
        <Link to="/" aria-label={`${SITE.name} – trang chủ`}><Brand /></Link>
        <div className={`nav-links ${menu ? 'open' : ''}`} onClick={() => setMenu(false)}>
          <a href="#programs">Chương trình</a>
          <a href="#benefits">Quyền lợi</a>
          <a href="#plans">Bảng giá</a>
          <a href="#contact">Hỗ trợ</a>
          <div className="nav-cta">
            {user ? (
              <Link className="btn btn-primary btn-sm" to="/dashboard"><span>Vào ứng dụng</span></Link>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" to="/login"><span>Đăng nhập</span></Link>
                <Link className="btn btn-primary btn-sm" to="/register"><span>Đăng ký hội viên</span></Link>
              </>
            )}
          </div>
        </div>
        <Button className="nav-toggle" variant="ghost" icon={menu ? 'x' : 'menu'} aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
      </nav>

      <header className="hero-x">
        <div className="hero-bg" aria-hidden><span>GYMFLOW</span></div>
        <div className="hero-slashes" aria-hidden><i /><i /><i /></div>
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="kicker">Phòng tập · Huấn luyện viên · Tiến độ</div>
            <h1 className="display">Tập đúng.<br /><span className="grad-text">Tiến bộ thật.</span></h1>
            <p className="lead">Lịch tập, giáo án và tiến độ của bạn ở cùng một nơi. Huấn luyện viên theo sát từng buổi, bạn thấy rõ mình mạnh lên mỗi tuần.</p>
            <div className="row row-wrap mt-24" style={{ gap: 12 }}>
              {primaryCta}
              <a className="btn btn-secondary btn-lg" href="#plans"><span>Xem bảng giá</span></a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden>
            <div className="hv-card hv-1">
              <div className="row" style={{ gap: 8 }}><Icon name="flame" className="ok" /><span className="tiny muted">Chuỗi tập</span></div>
              <div className="hv-num">6 <small>tuần liên tiếp</small></div>
            </div>
            <div className="hv-card hv-2">
              <div className="tiny muted">Buổi tiếp theo</div>
              <div className="hv-title">Leg day · 17:00</div>
              <div className="tiny faint">Squat 4×8 · Lunge 3×12 · Plank 3×45s</div>
            </div>
            <div className="hv-card hv-3">
              <div className="tiny muted">Cân nặng 8 tuần</div>
              <svg viewBox="0 0 160 48" className="hv-spark"><path d="M2 10 L24 14 L46 13 L68 20 L90 24 L112 27 L134 33 L158 38" /></svg>
              <div className="row between tiny"><span className="muted">72,4 kg</span><span className="ok">−3,1 kg</span></div>
            </div>
          </div>
        </div>
      </header>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[0, 1].map((k) => <div key={k}>{DISCIPLINES.map((d) => <span key={d}>{d}<i /></span>)}</div>)}
        </div>
      </div>

      <section className="section" id="programs">
        <div className="kicker">Chương trình tập</div>
        <h2 className="display-sm">Chọn mục tiêu. Chúng tôi lo lộ trình.</h2>
        <div className="grid grid-4 mt-24">
          {PROGRAMS.map((p, i) => (
            <article key={p.title} className="program">
              <span className="program-no">{String(i + 1).padStart(2, '0')}</span>
              <Icon name={p.icon} size={26} className="ok" />
              <h3>{p.title}</h3>
              <p className="muted small">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="benefits">
        <div className="kicker">Quyền lợi hội viên</div>
        <h2 className="display-sm">Mọi buổi tập đều được ghi lại.</h2>
        <div className="grid grid-3 mt-24">
          {BENEFITS.map((b) => (
            <div key={b.title} className="benefit">
              <div className="benefit-ic"><Icon name={b.icon} /></div>
              <div>
                <h3>{b.title}</h3>
                <p className="muted small mt-4">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="kicker">Tham gia</div>
        <h2 className="display-sm">Ba bước để bắt đầu.</h2>
        <ol className="steps mt-24">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-no">{i + 1}</span>
              <h3>{s.title}</h3>
              <p className="muted small">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="plans">
        <div className="kicker">Bảng giá</div>
        <h2 className="display-sm">Gói tập minh bạch.</h2>
        <p className="muted mt-8">Giá đã gồm VAT. Gói được kích hoạt sau khi thanh toán tại quầy lễ tân.</p>
        <div className="grid grid-3 mt-24">
          {plans.loading && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
          {plans.error && <p className="muted">Chưa tải được bảng giá. Vui lòng tải lại trang sau ít phút.</p>}
          {plans.data?.length === 0 && <p className="muted">Bảng giá đang được cập nhật.</p>}
          {plans.data?.map((p) => (
            <article key={p.id} className={`card price-card hoverable ${p.id === best ? 'best' : ''}`}>
              {p.id === best && <span className="ribbon">PHỔ BIẾN</span>}
              <div className="kicker" style={{ marginBottom: 0 }}>{durationLabel(p.durationDays)}</div>
              <h3 style={{ fontSize: 20 }}>{p.name}</h3>
              <div className="price">{fmtMoney(p.price)}</div>
              {p.description && <p className="muted small">{p.description}</p>}
              {p.benefits && (
                <div className="stack-sm small">
                  {p.benefits.split(/[,\n]/).map((b) => b.trim()).filter(Boolean).map((b) => (
                    <div key={b} className="row" style={{ gap: 8 }}><Icon name="check" size={15} className="ok" />{b}</div>
                  ))}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <Link className={`btn ${p.id === best ? 'btn-primary' : 'btn-secondary'} btn-block`} to={user ? '/me/packages' : '/register'}>
                <span>{user ? 'Xem gói của tôi' : 'Đăng ký để chọn gói'}</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta-band">
          <div>
            <h2 className="display-sm">Sẵn sàng cho buổi tập đầu tiên?</h2>
            <p className="muted mt-8">Tạo tài khoản miễn phí, ghé quầy chọn gói và bắt đầu ngay trong tuần này.</p>
          </div>
          {primaryCta}
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="section footer-grid">
          <div className="stack">
            <Brand />
            <p className="muted small">{SITE.slogan}</p>
          </div>
          <div className="stack-sm small">
            <b>Hỗ trợ khách hàng</b>
            <a className="muted" href={`mailto:${SITE.supportEmail}`}><Icon name="mail" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{SITE.supportEmail}</a>
            {SITE.hotline && <a className="muted" href={`tel:${SITE.hotline.replace(/\s/g, '')}`}><Icon name="phone" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{SITE.hotline}</a>}
            <span className="muted"><Icon name="clock" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{SITE.openingHours}</span>
            {SITE.address && <span className="muted">{SITE.address}</span>}
          </div>
          <div className="stack-sm small">
            <b>Tài khoản</b>
            <Link className="muted" to="/register">Đăng ký hội viên</Link>
            <Link className="muted" to="/login">Đăng nhập</Link>
            <Link className="muted" to="/forgot-password">Quên mật khẩu</Link>
          </div>
          <div className="stack-sm small">
            <b>Pháp lý</b>
            <Link className="muted" to="/policies#terms">Điều khoản sử dụng</Link>
            <Link className="muted" to="/policies#privacy">Chính sách bảo mật</Link>
          </div>
        </div>
        <div className="section footer-bottom">
          <span className="faint small">© {new Date().getFullYear()} {SITE.name}. Bảo lưu mọi quyền.</span>
          <Button variant="ghost" size="sm" icon="chevronDown" className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Lên đầu trang</Button>
        </div>
      </footer>
    </div>
  );
}
