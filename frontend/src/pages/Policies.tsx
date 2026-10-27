import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';
import { SITE } from '../site';
import { ThemeToggle } from '../theme/ThemeToggle';

/** Nội dung điều khoản & chính sách – dùng chung cho trang /policies và hộp thoại trong form đăng ký. */
export function TermsContent() {
  return (
    <div className="legal">
      <p>Khi tạo tài khoản hội viên {SITE.name}, bạn đồng ý với các điều khoản sau:</p>
      <ol>
        <li>Thông tin đăng ký (họ tên, email, số điện thoại) phải chính xác và thuộc về chính bạn.</li>
        <li>Mỗi người dùng một tài khoản; không chia sẻ mật khẩu hoặc cho người khác sử dụng tài khoản.</li>
        <li>Tài khoản trực tuyến dùng để xem lịch tập, giáo án, gói tập và tiến độ. Gói tập được kích hoạt sau khi thanh toán tại quầy lễ tân.</li>
        <li>Lịch tập do huấn luyện viên sắp xếp; buổi quá hạn chưa hoàn thành sẽ được ghi nhận vắng.</li>
        <li>{SITE.name} có thể tạm khoá tài khoản khi phát hiện sử dụng sai mục đích hoặc vi phạm nội quy phòng tập.</li>
      </ol>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="legal">
      <ol>
        <li><b>Dữ liệu thu thập:</b> họ tên, email, số điện thoại và các chỉ số tập luyện bạn hoặc huấn luyện viên ghi nhận (cân nặng, % mỡ, buổi tập).</li>
        <li><b>Mục đích:</b> quản lý gói tập, xếp lịch, theo dõi tiến độ và gửi thông báo liên quan đến việc tập luyện.</li>
        <li><b>Phạm vi truy cập:</b> chỉ bạn, huấn luyện viên được phân công và quản lý phòng tập xem được dữ liệu của bạn.</li>
        <li><b>Bảo mật:</b> mật khẩu được mã hoá một chiều (BCrypt), không ai – kể cả quản trị viên – xem được mật khẩu gốc.</li>
        <li><b>Quyền của bạn:</b> xem, cập nhật thông tin trong trang Hồ sơ; yêu cầu ngừng sử dụng dữ liệu qua email {SITE.supportEmail}.</li>
      </ol>
    </div>
  );
}

export default function Policies() {
  return (
    <div className="public">
      <nav className="landing-nav">
        <Link to="/"><Brand /></Link>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
        <Link className="btn btn-ghost btn-sm" to="/"><Icon name="arrowLeft" />Trang chủ</Link>
      </nav>
      <main className="section page legal-page">
        <div className="kicker">Pháp lý</div>
        <h1 className="display-sm">Điều khoản &amp; Chính sách</h1>
        <section id="terms" className="mt-24">
          <h2>Điều khoản sử dụng</h2>
          <TermsContent />
        </section>
        <section id="privacy" className="mt-24">
          <h2>Chính sách bảo mật</h2>
          <PrivacyContent />
        </section>
      </main>
    </div>
  );
}
