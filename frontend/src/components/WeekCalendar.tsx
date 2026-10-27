import type { Schedule } from '../api/types';
import { addDays, DAYS, fmtTime, isSameDay, parseDateTime, scheduleStatus } from '../lib/format';
import { Badge } from './ui';

const START = 5;
const END = 22;
const HOUR_PX = 52;

/** Lịch tuần dạng lưới giờ (desktop) + danh sách theo ngày (mobile). */
export function WeekCalendar({ weekStart, events, onSelect, showMember = true }: {
  weekStart: Date; events: Schedule[]; onSelect: (s: Schedule) => void; showMember?: boolean;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();
  const height = (END - START) * HOUR_PX;
  const top = (d: Date) => Math.max(0, (d.getHours() + d.getMinutes() / 60 - START) * HOUR_PX);
  const nowTop = top(now);

  return (
    <>
      <div className="week" role="grid" aria-label="Lịch tuần">
        <div className="wh" />
        {days.map((d, i) => (
          <div key={i} className={`wh ${isSameDay(d, now) ? 'today' : ''}`}>
            {DAYS[i]}<b>{d.getDate()}</b>
          </div>
        ))}
        <div className="hours" style={{ height }}>
          {Array.from({ length: END - START }, (_, i) => <div key={i} style={{ top: i * HOUR_PX }}>{String(START + i).padStart(2, '0')}:00</div>)}
        </div>
        {days.map((d, i) => {
          const list = events.filter((e) => isSameDay(parseDateTime(e.startTime), d));
          const today = isSameDay(d, now);
          return (
            <div key={i} className={`col ${today ? 'today' : ''}`} style={{ height, backgroundSize: `100% ${HOUR_PX}px` }}>
              {today && nowTop > 0 && nowTop < height && <div className="now-line" style={{ top: nowTop }} />}
              {list.map((e, k) => {
                const s = parseDateTime(e.startTime); const en = parseDateTime(e.endTime);
                const h = Math.max(26, top(en) - top(s) - 2);
                return (
                  <div key={e.id} className={`ev ${e.status}`} style={{ top: top(s) + 1, height: h, animationDelay: `${k * 0.04}s` }}
                    role="button" tabIndex={0} onClick={() => onSelect(e)} onKeyDown={(ev) => { if (ev.key === 'Enter') onSelect(e); }}
                    title={`${e.title} · ${fmtTime(e.startTime)}–${fmtTime(e.endTime)}`}>
                    <b>{fmtTime(e.startTime)} {showMember ? e.memberName : e.title}</b>
                    {h > 40 && <span>{showMember ? e.title : e.trainerName ?? 'Tự tập'}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="day-list">
        {days.map((d, i) => {
          const list = events.filter((e) => isSameDay(parseDateTime(e.startTime), d));
          if (list.length === 0) return null;
          return (
            <div key={i} className="card" style={{ padding: 14 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <b className={isSameDay(d, now) ? 'ok' : ''}>{DAYS[i]} · {d.getDate()}/{d.getMonth() + 1}</b>
                <span className="tiny faint">{list.length} buổi</span>
              </div>
              <div className="stack-sm">
                {list.map((e) => {
                  const [label, tone] = scheduleStatus[e.status];
                  return (
                    <button key={e.id} className="row between btn btn-secondary" style={{ height: 'auto', padding: '10px 12px', justifyContent: 'space-between' }} onClick={() => onSelect(e)}>
                      <span style={{ textAlign: 'left' }}>
                        <b>{fmtTime(e.startTime)}–{fmtTime(e.endTime)}</b>
                        <span className="tiny muted" style={{ display: 'block' }}>{showMember ? e.memberName + ' · ' : ''}{e.title}</span>
                      </span>
                      <Badge tone={tone}>{label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {events.length === 0 && <div className="muted small">Tuần này chưa có buổi tập.</div>}
      </div>
    </>
  );
}
