import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ArticleSummary, MembershipPlan } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';
import { Icon, type IconName } from '../components/Icon';
import { Button } from '../components/ui';
import { articleCategoryLabel, durationLabel, fmtMoney } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { SITE } from '../site';
import { ThemeToggle } from '../theme/ThemeToggle';
import { t } from '../i18n';

const DISCIPLINES = ['Thể hình', 'Giảm mỡ', 'Sức mạnh', 'Powerlifting', 'Yoga', 'Phục hồi', 'Cardio', 'PT 1 kèm 1'];

// Ba nhịp tim (sóng P-QRS-T) trên chiều dài 1200 đơn vị, nền phẳng ở y = 70
const beat = (x: number) => `L${x} 70 L${x + 14} 64 L${x + 28} 70 L${x + 40} 70 L${x + 48} 82 L${x + 60} 18 L${x + 72} 96 L${x + 82} 70 L${x + 104} 70 L${x + 124} 58 L${x + 144} 70`;
const ECG_PATH = `M0 70 ${beat(140)} ${beat(560)} ${beat(940)} L1200 70`;

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

// Mỗi điểm cam kết ứng với một quy tắc đang chạy thật trong hệ thống (duyệt nội dung, phân quyền, gói tập).
const TRUST: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'shield', title: 'Nội dung có nguồn', desc: 'Bài tập và kiến thức sức khoẻ ghi rõ nguồn tham khảo, chỉ hiển thị sau khi quản lý duyệt.' },
  { icon: 'lock', title: 'Dữ liệu của riêng bạn', desc: 'Hội viên chỉ xem được hồ sơ, lịch tập và tiến độ của chính mình.' },
  { icon: 'ticket', title: 'Không phí ẩn', desc: 'Giá gói hiển thị công khai, ngày hết hạn luôn có trên tài khoản.' },
];

const FAQ = [
  { q: 'Đăng ký tài khoản có mất phí không?', a: 'Không. Tạo tài khoản hội viên trực tuyến miễn phí; bạn chỉ trả tiền khi chọn gói tập tại quầy lễ tân.' },
  { q: 'Bao lâu thì gói tập được kích hoạt?', a: 'Gói được kích hoạt ngay khi lễ tân xác nhận thanh toán, và hiện trên tài khoản của bạn cùng ngày bắt đầu, ngày hết hạn.' },
  { q: 'Gia hạn sớm có bị mất ngày không?', a: 'Không. Gói mới được nối tiếp ngay sau ngày kết thúc của gói hiện tại. Hệ thống nhắc bạn trước khi gói hết hạn 7 ngày.' },
  { q: 'Ai xem được lịch tập và cân nặng của tôi?', a: 'Chỉ bạn, huấn luyện viên được phân công cho bạn và quản lý phòng tập.' },
  { q: 'Thông tin sức khoẻ trên trang có thay cho tư vấn y tế không?', a: 'Không. Nội dung chỉ mang tính tham khảo chung. Nếu có bệnh lý, chấn thương hoặc đang mang thai, hãy hỏi ý kiến nhân viên y tế trước khi tập.' },
  { q: 'Tôi quên mật khẩu thì làm sao?', a: 'Chọn "Quên mật khẩu?" ở trang đăng nhập và làm theo hướng dẫn để đặt mật khẩu mới.' },
];

export default function Landing() {
  const { user } = useAuth();
  const plans = useAsync(() => api.get<MembershipPlan[]>('/plans/public'), []);
  const articles = useAsync(() => api.get<ArticleSummary[]>('/articles/public', { q: '', category: '' }), []);
  const latest = articles.data?.slice(0, 3) ?? [];
  const best = plans.data && plans.data.length > 2 ? plans.data[1].id : null;
  const [menu, setMenu] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Hiện dần khi cuộn tới. Chỉ ẩn nội dung sau khi JS đã chạy (class reveal-on), nên lỗi JS không làm mất nội dung.
  // Chạy lại khi bảng giá / bài viết tải xong để bắt cả các thẻ vừa được vẽ thêm.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    root.classList.add('reveal-on');
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    root.querySelectorAll<HTMLElement>('.reveal:not(.in)').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${(i % 4) * 70}ms`);
      io.observe(el);
    });
    return () => io.disconnect();
  }, [plans.data, articles.data]);

  // Ánh sáng đi theo con trỏ trên các thẻ .spot (lấy ý tưởng "cursor light" của libraries.dev/metal)
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menu]);

  const primaryCta = user
    ? <Link className="btn btn-primary btn-lg" to="/dashboard"><span>{t('Vào trang của tôi')}</span><Icon name="arrowRight" /></Link>
    : <Link className="btn btn-primary btn-lg" to="/register"><span>{t('Đăng ký hội viên')}</span><Icon name="arrowRight" /></Link>;

  return (
    <div className="public" ref={rootRef} onPointerMove={onPointerMove}>
      <div className="scroll-progress" aria-hidden />
      <nav className="landing-nav">
        <Link to="/" aria-label={`${SITE.name} – ${t('trang chủ')}`}><Brand /></Link>
        <div className={`nav-links ${menu ? 'open' : ''}`} onClick={() => setMenu(false)}>
          <a href="#programs">{t('Chương trình')}</a>
          <a href="#benefits">{t('Quyền lợi')}</a>
          <a href="#plans">{t('Bảng giá')}</a>
          <Link to="/knowledge">{t('Kiến thức')}</Link>
          <a href="#faq">{t('Hỏi đáp')}</a>
          <a href="#contact">{t('Hỗ trợ')}</a>
          <div className="nav-cta">
            {user ? (
              <Link className="btn btn-primary btn-sm" to="/dashboard"><span>{t('Vào ứng dụng')}</span></Link>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" to="/login"><span>{t('Đăng nhập')}</span></Link>
                <Link className="btn btn-primary btn-sm" to="/register"><span>{t('Đăng ký hội viên')}</span></Link>
              </>
            )}
          </div>
        </div>
        <ThemeToggle className="nav-theme" />
        <Button className="nav-toggle" variant="ghost" icon={menu ? 'x' : 'menu'} aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
      </nav>

      <header className="hero-x">
        <div className="hero-bg" aria-hidden><span>GYMFLOW</span></div>
        <div className="hero-slashes" aria-hidden><i /><i /><i /></div>
        <div className="hero-glow" aria-hidden><i /><i /></div>
        <div className="hero-speed" aria-hidden><i /><i /><i /><i /></div>
        {/* Đường điện tim chạy ngang hero: một vệt sáng di chuyển trên nền đường mờ */}
        <svg className="hero-ecg" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
          <path className="ecg-base" d={ECG_PATH} />
          <path className="ecg-pulse" d={ECG_PATH} pathLength={1000} />
        </svg>
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="kicker">{t('Phòng tập · Huấn luyện viên · Tiến độ')}</div>
            <h1 className="display">{t('Tập đúng.')}<br /><span className="grad-text">{t('Tiến bộ thật.')}</span></h1>
            <p className="lead">{t('Lịch tập, giáo án và tiến độ của bạn ở cùng một nơi. Huấn luyện viên theo sát từng buổi, bạn thấy rõ mình mạnh lên mỗi tuần.')}</p>
            <div className="row row-wrap mt-24" style={{ gap: 12 }}>
              {primaryCta}
              <a className="btn btn-secondary btn-lg" href="#plans"><span>{t('Xem bảng giá')}</span></a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden>
            {/* Ảnh minh hoạ giao diện ứng dụng (aria-hidden). Ba vòng ứng với dữ liệu GymFlow ghi thật:
                số buổi tập trong tuần, phút vận động (mục tiêu 150 phút/tuần theo khuyến nghị cho người lớn) và calo ghi sau buổi tập. */}
            <div className="hv-card hv-1 hv-rings">
              <div className="row between" style={{ gap: 8 }}>
                <span className="row tiny muted" style={{ gap: 6 }}><Icon name="heart" size={15} className="beat" />{t('Hoạt động tuần này')}</span>
                <span className="hv-streak"><Icon name="flame" size={13} />6</span>
              </div>
              <div className="row" style={{ gap: 14, marginTop: 10 }}>
                <svg viewBox="0 0 100 100" className="rings">
                  <circle className="ring-bg" cx="50" cy="50" r="42" /><circle className="ring r1" cx="50" cy="50" r="42" pathLength={100} />
                  <circle className="ring-bg" cx="50" cy="50" r="31" /><circle className="ring r2" cx="50" cy="50" r="31" pathLength={100} />
                  <circle className="ring-bg" cx="50" cy="50" r="20" /><circle className="ring r3" cx="50" cy="50" r="20" pathLength={100} />
                </svg>
                <div className="ring-legend">
                  <div><i className="r1" />{t('Buổi tập')} <b>3/4</b></div>
                  <div><i className="r2" />{t('Phút vận động')} <b>120/150</b></div>
                  <div><i className="r3" />{t('Calo')} <b>1.450</b></div>
                </div>
              </div>
            </div>
            <div className="hv-card hv-2">
              <div className="tiny muted">{t('Buổi tiếp theo')}</div>
              <div className="hv-title">Leg day · 17:00</div>
              <div className="tiny faint">Squat 4×8 · Lunge 3×12 · Plank 3×45s</div>
            </div>
            <div className="hv-card hv-3">
              <div className="tiny muted">{t('Cân nặng 8 tuần')}</div>
              <svg viewBox="0 0 160 48" className="hv-spark"><path d="M2 10 L24 14 L46 13 L68 20 L90 24 L112 27 L134 33 L158 38" /></svg>
              <div className="row between tiny"><span className="muted">72,4 kg</span><span className="ok">−3,1 kg</span></div>
            </div>
          </div>
        </div>
      </header>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[0, 1].map((k) => <div key={k}>{DISCIPLINES.map((d) => <span key={d}>{t(d)}<i /></span>)}</div>)}
        </div>
      </div>

      <section className="section" id="programs">
        <div className="kicker">{t('Chương trình tập')}</div>
        <h2 className="display-sm">{t('Chọn mục tiêu. Chúng tôi lo lộ trình.')}</h2>
        <div className="grid grid-4 mt-24">
          {PROGRAMS.map((p, i) => (
            <article key={p.title} className="program spot beam beam-hover reveal">
              <span className="program-no">{String(i + 1).padStart(2, '0')}</span>
              <Icon name={p.icon} size={26} className="ok" />
              <h3>{t(p.title)}</h3>
              <p className="muted small">{t(p.desc)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="benefits">
        <div className="kicker">{t('Quyền lợi hội viên')}</div>
        <h2 className="display-sm">{t('Mọi buổi tập đều được ghi lại.')}</h2>
        <div className="bento mt-24">
          {BENEFITS.map((b) => (
            <div key={b.title} className="benefit spot reveal">
              <div className="benefit-ic"><Icon name={b.icon} /></div>
              <div>
                <h3>{t(b.title)}</h3>
                <p className="muted small mt-4">{t(b.desc)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="kicker">{t('Tham gia')}</div>
        <h2 className="display-sm">{t('Ba bước để bắt đầu.')}</h2>
        <ol className="steps mt-24">
          {STEPS.map((s, i) => (
            <li key={s.title} className="reveal">
              <span className="step-no">{i + 1}</span>
              <h3>{t(s.title)}</h3>
              <p className="muted small">{t(s.desc)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="plans">
        <div className="kicker">{t('Bảng giá')}</div>
        <h2 className="display-sm">{t('Gói tập minh bạch.')}</h2>
        <p className="muted mt-8">{t('Giá đã gồm VAT. Gói được kích hoạt sau khi thanh toán tại quầy lễ tân.')}</p>
        <div className="grid grid-3 mt-24">
          {plans.loading && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
          {plans.error && <p className="muted">{t('Chưa tải được bảng giá. Vui lòng tải lại trang sau ít phút.')}</p>}
          {plans.data?.length === 0 && <p className="muted">{t('Bảng giá đang được cập nhật.')}</p>}
          {plans.data?.map((p) => (
            <article key={p.id} className={`card price-card hoverable spot reveal ${p.id === best ? 'best beam' : ''}`}>
              {p.id === best && <span className="ribbon">{t('PHỔ BIẾN')}</span>}
              <div className="kicker" style={{ marginBottom: 0 }}>{durationLabel(p.durationDays)}</div>
              <h3 style={{ fontSize: 20 }}>{t(p.name)}</h3>
              <div className="price">{fmtMoney(p.price)}</div>
              {p.description && <p className="muted small">{t(p.description)}</p>}
              {p.benefits && (
                <div className="stack-sm small">
                  {p.benefits.split(/[,\n]/).map((b) => b.trim()).filter(Boolean).map((b) => (
                    <div key={b} className="row" style={{ gap: 8 }}><Icon name="check" size={15} className="ok" />{t(b)}</div>
                  ))}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <Link className={`btn ${p.id === best ? 'btn-primary' : 'btn-secondary'} btn-block`} to={user ? '/me/packages' : '/register'}>
                <span>{t(user ? 'Xem gói của tôi' : 'Đăng ký để chọn gói')}</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="trust-strip">
          {TRUST.map((x) => (
            <div key={x.title} className="trust-item reveal">
              <Icon name={x.icon} className="ok" />
              <div>
                <b>{t(x.title)}</b>
                <p className="muted small mt-4">{t(x.desc)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="knowledge">
        <div className="row between row-wrap" style={{ gap: 12, alignItems: 'end' }}>
          <div>
            <div className="kicker">{t('Kho kiến thức')}</div>
            <h2 className="display-sm">{t('Ăn, ngủ, tập đúng cách.')}</h2>
            <p className="muted mt-8">{t('Dinh dưỡng, nước uống, giấc ngủ, khởi động và phòng chấn thương – mỗi bài đều ghi nguồn tham khảo.')}</p>
          </div>
          <Link className="btn btn-secondary" to="/knowledge"><span>{t('Xem tất cả')}</span><Icon name="arrowRight" /></Link>
        </div>
        {articles.loading && <div className="article-grid mt-24">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}</div>}
        {latest.length > 0 && (
          <div className="article-grid mt-24">
            {latest.map((a) => (
              <Link key={a.id} to={`/knowledge/${a.slug}`} className="article-card spot reveal">
                <span className="kicker">{articleCategoryLabel[a.category]}</span>
                <h3>{a.title}</h3>
                <p className="small muted">{a.summary}</p>
                <span className="link-btn small">{t('Đọc bài')} <Icon name="arrowRight" size={14} /></span>
              </Link>
            ))}
          </div>
        )}
        {!articles.loading && latest.length === 0 && (
          <p className="muted small mt-16">{t('Các bài viết đang được quản lý phòng tập duyệt nội dung và nguồn, sẽ sớm xuất hiện tại đây.')}</p>
        )}
      </section>

      <section className="section" id="faq">
        <div className="kicker">{t('Hỏi đáp')}</div>
        <h2 className="display-sm">{t('Câu hỏi thường gặp.')}</h2>
        <div className="faq mt-24 reveal">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{t(f.q)}<Icon name="chevronDown" size={18} /></summary>
              <p className="muted">{t(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta-band beam beam-slow">
          <div>
            <h2 className="display-sm">{t('Sẵn sàng cho buổi tập đầu tiên?')}</h2>
            <p className="muted mt-8">{t('Tạo tài khoản miễn phí, ghé quầy chọn gói và bắt đầu ngay trong tuần này.')}</p>
          </div>
          {primaryCta}
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="section footer-grid">
          <div className="stack">
            <Brand />
            <p className="muted small">{t(SITE.slogan)}</p>
          </div>
          <div className="stack-sm small">
            <b>{t('Hỗ trợ khách hàng')}</b>
            <a className="muted" href={`mailto:${SITE.supportEmail}`}><Icon name="mail" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{SITE.supportEmail}</a>
            {SITE.hotline && <a className="muted" href={`tel:${SITE.hotline.replace(/\s/g, '')}`}><Icon name="phone" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{SITE.hotline}</a>}
            <span className="muted"><Icon name="clock" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{t(SITE.openingHours)}</span>
            {SITE.address && <span className="muted">{SITE.address}</span>}
          </div>
          <div className="stack-sm small">
            <b>{t('Tài khoản')}</b>
            <Link className="muted" to="/register">{t('Đăng ký hội viên')}</Link>
            <Link className="muted" to="/login">{t('Đăng nhập')}</Link>
            <Link className="muted" to="/forgot-password">{t('Quên mật khẩu')}</Link>
          </div>
          <div className="stack-sm small">
            <b>{t('Pháp lý')}</b>
            <Link className="muted" to="/knowledge">{t('Kho kiến thức')}</Link>
            <Link className="muted" to="/policies#terms">{t('Điều khoản sử dụng')}</Link>
            <Link className="muted" to="/policies#privacy">{t('Chính sách bảo mật')}</Link>
          </div>
        </div>
        <div className="section footer-bottom">
          <span className="faint small">© {new Date().getFullYear()} {SITE.name}. {t('Bảo lưu mọi quyền.')}</span>
          <Button variant="ghost" size="sm" icon="chevronDown" className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Lên đầu trang</Button>
        </div>
      </footer>
    </div>
  );
}
