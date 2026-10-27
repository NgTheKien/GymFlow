import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { MemberDashboard as Data, Schedule } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Alert, Badge, Button, Card, CountUp, Empty, ErrorState, LoadingBlock, Meter, PageHead, Stat, StatusBadge } from '../../components/ui';
import { DAYS, fmtDate, fmtTime, fmtWeekday, parseDate, parseDateTime, scheduleStatus, subState } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { SessionModal } from '../shared/Schedules';

export default function MemberDashboard() {
  const { data, error, loading, reload } = useAsync(() => api.get<Data>('/dashboard/member'), []);
  const [open, setOpen] = useState<Schedule | null>(null);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <div className="page"><PageHead title="Tổng quan" /><LoadingBlock rows={6} /></div>;

  const sub = data.currentSubscription;
  const firstName = data.member.fullName.split(' ').slice(-1)[0];
  const totalDays = sub ? (parseDate(sub.endDate).getTime() - parseDate(sub.startDate).getTime()) / 86400000 + 1 : 1;
  const now = new Date();
  const toComplete = data.weekSessions.find((s) => s.status === 'SCHEDULED' && parseDateTime(s.startTime) <= now);

  return (
    <div className="page">
      <div className="hero">
        <div className="row between row-wrap" style={{ position: 'relative', gap: 20 }}>
          <div>
            <div className="chip on"><Icon name="flame" size={14} /> Chuỗi {data.streakWeeks} tuần</div>
            <h2 className="mt-8">Chào {firstName}, sẵn sàng tập chưa?</h2>
            <p className="muted mt-8">
              {data.nextSession
                ? <>Buổi tiếp theo: <b style={{ color: 'var(--ink)' }}>{fmtWeekday(data.nextSession.startTime)} lúc {fmtTime(data.nextSession.startTime)}</b> · {data.nextSession.title}</>
                : 'Bạn chưa có buổi tập sắp tới. Liên hệ HLV để xếp lịch nhé.'}
            </p>
          </div>
          <div className="row">
            <Link to="/me/plan" className="btn btn-secondary"><Icon name="clipboard" /><span>Giáo án</span></Link>
            <Link to="/me/progress" className="btn btn-primary"><Icon name="scale" /><span>Ghi cân nặng</span></Link>
          </div>
        </div>
      </div>

      {toComplete && (
        <div className="mt-16">
          <Alert kind="success" action={<Button size="sm" variant="primary" onClick={() => setOpen(toComplete)}>Đánh dấu hoàn thành</Button>}>
            Bạn đã tập xong <b>{toComplete.title}</b> lúc {fmtTime(toComplete.startTime)}? Ghi lại để giữ chuỗi tuần tập.
          </Alert>
        </div>
      )}
      {sub && (sub.state === 'EXPIRING' || sub.state === 'EXPIRED') && (
        <div className="mt-16">
          <Alert kind="warning" action={<Link to="/me/packages" className="btn btn-sm btn-secondary"><span>Xem gói</span></Link>}>
            {sub.state === 'EXPIRING' ? <>Gói <b>{sub.planName}</b> còn {sub.daysLeft} ngày, hết hạn {fmtDate(sub.endDate)}. Gia hạn tại quầy để không gián đoạn.</> : <>Gói tập của bạn đã hết hạn ngày {fmtDate(sub.endDate)}.</>}
          </Alert>
        </div>
      )}

      <div className="grid grid-4 mt-24">
        <Stat icon="ticket" label="Gói hiện tại" value={sub ? <CountUp value={sub.daysLeft} /> : '—'} unit={sub ? 'ngày' : undefined}
          foot={sub ? <>{sub.planName} · <StatusBadge map={subState} value={sub.state} /></> : 'Chưa đăng ký gói'} />
        <Stat icon="checkCircle" label="Buổi hoàn thành tháng này" value={<CountUp value={data.completedThisMonth} />} accent="#3d97ff" foot={`${data.weekSessions.length} buổi trong tuần này`} />
        <Stat icon="scale" label="Cân nặng gần nhất" value={data.latestWeight ? <CountUp value={data.latestWeight.weightKg} /> : '—'} unit={data.latestWeight ? 'kg' : undefined} accent="#8b7cff"
          foot={data.latestWeight ? `Ngày ${fmtDate(data.latestWeight.recordedDate)}` : 'Chưa có số liệu'} />
        <Stat icon="heart" label="BMI" value={data.bmi ?? '—'} accent="#ffb020" foot={data.bmiCategory ?? 'Cần chiều cao & cân nặng'} />
      </div>

      <div className="grid grid-main mt-24">
        <Card title="Tuần này" icon="calendar" actions={<Link to="/me/schedule" className="link small">Lịch đầy đủ</Link>}>
          {data.weekSessions.length === 0 ? <Empty icon="calendar" title="Tuần này chưa có buổi tập" /> : (
            <div className="stack-sm">
              {data.weekSessions.map((s) => {
                const d = parseDateTime(s.startTime);
                return (
                  <button key={s.id} className="btn btn-secondary" style={{ height: 'auto', padding: '12px 14px', justifyContent: 'flex-start', gap: 14 }} onClick={() => setOpen(s)}>
                    <div style={{ width: 44, textAlign: 'center' }}>
                      <div className="tiny faint">{DAYS[(d.getDay() + 6) % 7]}</div>
                      <div className="num" style={{ fontSize: 20 }}>{d.getDate()}</div>
                    </div>
                    <div className="grow" style={{ textAlign: 'left' }}>
                      <div>{s.title}</div>
                      <div className="tiny muted">{fmtTime(s.startTime)}–{fmtTime(s.endTime)} · {s.trainerName ?? 'Tự tập'}</div>
                    </div>
                    <StatusBadge map={scheduleStatus} value={s.status} />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
        <Card title="Gói tập" icon="ticket">
          {sub ? (
            <div className="stack">
              <div className="row between"><b style={{ fontSize: 18 }}>{sub.planName}</b><StatusBadge map={subState} value={sub.state} /></div>
              <Meter value={Math.max(0, totalDays - sub.daysLeft)} max={totalDays} color={sub.state === 'EXPIRING' ? 'var(--warning)' : undefined} />
              <div className="row between small muted"><span>{fmtDate(sub.startDate)}</span><span>{fmtDate(sub.endDate)}</span></div>
              <div className="divider" />
              {data.currentPlan ? (
                <div className="stack-sm">
                  <span className="tiny faint">Giáo án đang áp dụng</span>
                  <b>{data.currentPlan.name}</b>
                  <span className="small muted">{data.currentPlan.trainingDays} ngày/tuần · {data.currentPlan.itemCount} bài · HLV {data.currentPlan.trainerName ?? '—'}</span>
                  <Badge tone="green">Đến {fmtDate(data.currentPlan.endDate)}</Badge>
                </div>
              ) : <span className="muted small">Chưa có giáo án. HLV sẽ soạn cho bạn.</span>}
            </div>
          ) : <Empty icon="ticket" title="Chưa có gói tập" desc="Đăng ký gói tại quầy lễ tân." />}
        </Card>
      </div>
      {open && <SessionModal session={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void reload(); }} />}
    </div>
  );
}
