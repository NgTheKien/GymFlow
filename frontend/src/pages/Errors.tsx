import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

function ErrorPage({ code, title, desc }: { code: string; title: string; desc: string }) {
  return (
    <div className="page empty" style={{ minHeight: '60vh', justifyContent: 'center' }}>
      <div className="big-code grad-text">{code}</div>
      <h4 style={{ fontSize: 22 }}>{title}</h4>
      <p className="muted">{desc}</p>
      <Link to="/dashboard" className="btn btn-primary mt-8"><Icon name="home" /><span>Về trang tổng quan</span></Link>
    </div>
  );
}

export const NotFound = () => <ErrorPage code="404" title="Không tìm thấy trang" desc="Đường dẫn không tồn tại hoặc đã bị thay đổi." />;
export const Forbidden = () => <ErrorPage code="403" title="Không có quyền truy cập" desc="Chức năng này không dành cho vai trò của bạn." />;
