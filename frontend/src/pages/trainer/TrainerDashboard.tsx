import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Schedule, TrainerDashboard as Data } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { BarChart, Ring } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { Badge, Card, CountUp, Empty, ErrorState, LoadingBlock, PageHead, Person, Stat, StatusBadge } from '../../components/ui';
import { fmtDate, fmtTime, parseDateTime, scheduleStatus } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { SessionModal } from '../shared/Schedules';
import { t } from '../../i18n';

export default function TrainerDashboard() {
  const me = useMe();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.get<Data>('/dashboard/trainer'), []);
  const [open, setOpen] = useState<Schedule | null>(null);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <div className="page"><PageHead title="Tổng quan" /><LoadingBlock rows={6} /></div>;
  const now = new Date();
  const next = data.todaySessions.find((s) => s.status === 'SCHEDULED' && parseDateTime(s.endTime) > now);

  return (
    <div className="page">
      <PageHead eyebrow="Huấn luyện viên" title={t('Hôm nay của {name}', { name: me.fullName.split(' ').slice(-1)[0] })}
        desc={next ? t('Buổi tiếp theo lúc {time} với {name}.', { time: fmtTime(next.startTime), name: next.memberName }) : 'Không còn buổi nào trong hôm nay.'}
        actions={<>
          <Link className="btn btn-secondary" to="/workout-plans/new"><Icon name="clipboard" /><span>{t('Soạn giáo án')}</span></Link>
          <Link className="btn btn-primary" to="/schedules?new=1"><Icon name="plus" /><span>{t('Xếp lịch')}</span></Link>
        </>} />

      <div className="grid grid-4">
        <Stat icon="users" label="Hội viên phụ trách" value={<CountUp value={data.memberCount} />} foot={t('{n} giáo án đang áp dụng', { n: data.activePlans })} />
        <Stat icon="calendar" label="Buổi hôm nay" value={<CountUp value={data.sessionsToday} />} accent="#3d97ff" foot={t('{n} buổi trong tuần', { n: data.sessionsThisWeek })} />
        <Stat icon="checkCircle" label="Hoàn thành tuần này" value={<CountUp value={data.completedThisWeek} />} accent="#00d95b" foot={t('{n} buổi vắng', { n: data.missedThisWeek })} />
        <Stat icon="target" label="Tỉ lệ đi tập" value={data.completionRate == null ? '—' : <CountUp value={data.completionRate} />} unit={data.completionRate == null ? undefined : '%'} accent="#8b7cff" foot="Hoàn thành / (hoàn thành + vắng)" />
      </div>

      <div className="grid grid-main mt-24">
        <Card title="Lịch hôm nay" icon="clock" flush actions={<Link to="/schedules" className="link small">{t('Mở lịch tuần')}</Link>}>
          {data.todaySessions.length === 0 ? <Empty icon="calendar" title="Hôm nay không có buổi tập" desc="Tranh thủ soạn giáo án mới nhé!" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>{t('Giờ')}</th><th>{t('Hội viên')}</th><th>{t('Nội dung')}</th><th>{t('Trạng thái')}</th></tr></thead>
                <tbody>
                  {data.todaySessions.map((s) => (
                    <tr key={s.id} className="clickable" onClick={() => setOpen(s)}>
                      <td className="num nowrap">{fmtTime(s.startTime)}–{fmtTime(s.endTime)}</td>
                      <td><Person name={s.memberName} size="sm" /></td>
                      <td className="muted">{s.title}</td>
                      <td><StatusBadge map={scheduleStatus} value={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Tuần này" icon="activity">
          <div className="row" style={{ justifyContent: 'center' }}>
            <Ring value={data.completedThisWeek} max={Math.max(1, data.completedThisWeek + data.missedThisWeek)}
              sub={t('đi tập')} label={data.completionRate == null ? '—' : `${Math.round(data.completionRate)}%`} />
          </div>
          <BarChart data={data.weekLoad} height={150} highlightLast={false} />
        </Card>
      </div>

      <Card className="mt-24" title="Hội viên sắp hết gói" icon="alert" flush>
        {data.expiringMembers.length === 0 ? <Empty icon="checkCircle" title="Không có hội viên nào sắp hết gói" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('Hội viên')}</th><th>{t('Gói')}</th><th>{t('Hết hạn')}</th><th className="right">{t('Còn lại')}</th></tr></thead>
              <tbody>
                {data.expiringMembers.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => navigate(`/members/${s.memberId}`)}>
                    <td><Person name={s.memberName} sub={s.memberCode} size="sm" /></td>
                    <td>{s.planName}</td>
                    <td>{fmtDate(s.endDate)}</td>
                    <td className="right"><Badge tone="amber">{t('{n} ngày', { n: s.daysLeft })}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <SessionModal session={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void reload(); }} />}
    </div>
  );
}
