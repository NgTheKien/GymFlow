import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { AdminDashboard as Data } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { BarChart, Donut } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { Badge, Card, CountUp, Empty, ErrorState, LoadingBlock, PageHead, Person, Stat } from '../../components/ui';
import { actionLabel, fmtDate, fmtMoney, fmtMoneyShort, pctChange, relativeTime } from '../../lib/format';
import { useAsync } from '../../lib/hooks';

export default function AdminDashboard() {
  const me = useMe();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.get<Data>('/dashboard/admin'), []);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <div className="page"><PageHead title="Tổng quan" /><LoadingBlock rows={6} /></div>;

  const growth = pctChange(data.revenueThisMonth, data.revenuePrevMonth);
  const coverage = data.totalMembers ? Math.round((data.membersWithActivePackage / data.totalMembers) * 100) : 0;

  return (
    <div className="page">
      <PageHead eyebrow={greet} title={`Xin chào, ${me.fullName.split(' ').slice(-1)[0]}`}
        desc="Toàn cảnh phòng tập hôm nay: hội viên, doanh thu, gói sắp hết hạn và hoạt động mới nhất."
        actions={<>
          <Link className="btn btn-secondary" to="/reports"><Icon name="chart" /><span>Báo cáo</span></Link>
          <Link className="btn btn-primary" to="/members?new=1"><Icon name="plus" /><span>Thêm hội viên</span></Link>
        </>} />

      <div className="grid grid-4">
        <Stat icon="users" label="Hội viên" value={<CountUp value={data.totalMembers} />}
          foot={<><span className="trend-up">+{data.newMembersThisMonth}</span> tháng này · {data.activeMembers} đang hoạt động</>} />
        <Stat icon="ticket" label="Có gói hiệu lực" value={<CountUp value={data.membersWithActivePackage} />} accent="#3d97ff"
          foot={`${coverage}% tổng hội viên`} />
        <Stat icon="wallet" label="Doanh thu tháng" value={<CountUp value={data.revenueThisMonth} format={fmtMoneyShort} />} accent="#8b7cff"
          foot={<><span className={growth >= 0 ? 'trend-up' : 'trend-down'}><Icon name={growth >= 0 ? 'trendUp' : 'trendDown'} size={13} /> {growth >= 0 ? '+' : ''}{growth}%</span> so với tháng trước</>} />
        <Stat icon="clock" label="Sắp hết hạn (7 ngày)" value={<CountUp value={data.expiringSoon} />} accent="#ffb020"
          foot={`${data.sessionsToday} buổi tập hôm nay · ${data.activeTrainers} HLV`} />
      </div>

      <div className="grid grid-main mt-24">
        <Card title="Doanh thu 6 tháng" icon="chart" actions={<span className="tiny faint">Theo ngày thu tiền</span>}>
          <BarChart data={data.revenueByMonth.map((r) => ({ label: r.label.slice(0, 5), value: r.value }))} format={fmtMoneyShort} />
        </Card>
        <Card title="Gói đang hiệu lực" icon="layers">
          {data.planDistribution.length ? <Donut data={data.planDistribution} sub="hội viên" /> : <Empty title="Chưa có gói hiệu lực" />}
        </Card>
      </div>

      <div className="grid grid-2 mt-24">
        <Card title="Gói sắp hết hạn" icon="alert" flush actions={<Link to="/subscriptions?state=EXPIRING" className="link small">Xem tất cả</Link>}>
          {data.expiring.length === 0 ? <Empty icon="checkCircle" title="Không có gói nào sắp hết hạn" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Hội viên</th><th>Gói</th><th>Hết hạn</th><th className="right">Còn</th></tr></thead>
                <tbody>
                  {data.expiring.map((s) => (
                    <tr key={s.id} className="clickable" onClick={() => navigate(`/members/${s.memberId}`)}>
                      <td><Person name={s.memberName} sub={s.memberCode} size="sm" /></td>
                      <td>{s.planName}</td>
                      <td className="nowrap">{fmtDate(s.endDate)}</td>
                      <td className="right"><Badge tone={s.daysLeft <= 3 ? 'red' : 'amber'}>{s.daysLeft} ngày</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Hoạt động gần đây" icon="activity" actions={<Link to="/audit-logs" className="link small">Nhật ký</Link>}>
          <div className="stack">
            {data.recentActivity.map((a) => (
              <div key={a.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="muscle-ic" style={{ width: 32, height: 32, borderRadius: 10, ['--c' as string]: a.success ? '#00d95b' : '#ff6b61' }}>
                  <Icon name={a.success ? 'check' : 'x'} size={15} />
                </div>
                <div className="grow">
                  <div className="small"><b>{actionLabel[a.action] ?? a.action}</b>{a.detail && <span className="muted"> · {a.detail}</span>}</div>
                  <div className="tiny faint">{a.actorEmail ?? 'hệ thống'} · {relativeTime(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <p className="tiny faint mt-16">Doanh thu tháng này: {fmtMoney(data.revenueThisMonth)} · tháng trước: {fmtMoney(data.revenuePrevMonth)}</p>
    </div>
  );
}
