import { api } from '../../api/client';
import type { MembershipPlan, Subscription } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Alert, Card, Empty, ErrorState, LoadingBlock, Meter, PageHead, StatusBadge } from '../../components/ui';
import { durationLabel, fmtDate, fmtMoney, parseDate, subState } from '../../lib/format';
import { useAsync } from '../../lib/hooks';

export default function MyPackages() {
  const subs = useAsync(() => api.get<Subscription[]>('/subscriptions/me'), []);
  const plans = useAsync(() => api.get<MembershipPlan[]>('/plans'), []);
  if (subs.error) return <ErrorState message={subs.error} onRetry={subs.reload} />;
  if (subs.loading || !subs.data) return <div className="page"><PageHead title="Gói tập của tôi" /><LoadingBlock rows={6} /></div>;

  const current = subs.data.find((s) => s.state === 'ACTIVE' || s.state === 'EXPIRING');
  const upcoming = subs.data.filter((s) => s.state === 'UPCOMING');
  const total = current ? (parseDate(current.endDate).getTime() - parseDate(current.startDate).getTime()) / 86400000 + 1 : 1;

  return (
    <div className="page">
      <PageHead eyebrow="Thành viên" title="Gói tập của tôi" desc="Trạng thái gói tính theo ngày hôm nay. Gia hạn tại quầy sẽ được nối tiếp ngay sau gói hiện tại." />
      {current?.state === 'EXPIRING' && upcoming.length === 0 && <div style={{ marginBottom: 18 }}><Alert kind="warning">Gói của bạn còn {current.daysLeft} ngày. Gia hạn sớm để không bị gián đoạn lịch tập.</Alert></div>}
      {!current && upcoming.length === 0 && <div style={{ marginBottom: 18 }}><Alert kind="error">Bạn chưa có gói tập hiệu lực, chưa thể xếp lịch tập mới.</Alert></div>}

      <div className="grid grid-main" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: 18 }}>
          {current && (
            <div className="hero">
              <div style={{ position: 'relative' }}>
                <div className="row between"><span className="chip on"><Icon name="ticket" size={14} /> Gói hiện tại</span><StatusBadge map={subState} value={current.state} /></div>
                <h2 className="mt-16">{current.planName}</h2>
                <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span className="num" style={{ fontSize: 44 }}>{current.daysLeft}</span><span className="muted">ngày còn lại</span>
                </div>
                <div className="mt-16"><Meter value={total - current.daysLeft} max={total} color={current.state === 'EXPIRING' ? 'var(--warning)' : undefined} /></div>
                <div className="row between small muted mt-8"><span>Bắt đầu {fmtDate(current.startDate)}</span><span>Hết hạn {fmtDate(current.endDate)}</span></div>
              </div>
            </div>
          )}
          <Card title="Lịch sử đăng ký" icon="scroll" flush>
            {subs.data.length === 0 ? <Empty icon="ticket" title="Chưa có gói nào" /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Gói</th><th>Thời gian</th><th>Số tiền</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {subs.data.map((s) => (
                      <tr key={s.id}>
                        <td><b>{s.planName}</b></td>
                        <td className="small nowrap">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</td>
                        <td className="num">{fmtMoney(s.pricePaid)}</td>
                        <td><StatusBadge map={subState} value={s.state} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <Card title="Các gói đang mở bán" icon="sparkle">
          <div className="stack-sm">
            {plans.data?.map((p) => (
              <div key={p.id} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--hairline-soft)' }}>
                <div><b className="small">{p.name}</b><div className="tiny faint">{durationLabel(p.durationDays)}{p.benefits ? ` · ${p.benefits}` : ''}</div></div>
                <span className="num small">{fmtMoney(p.price)}</span>
              </div>
            ))}
            <p className="tiny faint mt-8">Liên hệ lễ tân để đăng ký hoặc gia hạn.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
