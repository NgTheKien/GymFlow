import { useState } from 'react';
import type { PlanItem } from '../api/types';
import { DAYS, DAY_NAMES, muscleColor, muscleLabel } from '../lib/format';
import { Icon } from './Icon';
import { Empty } from './ui';

/** Hiển thị giáo án theo ngày (chỉ xem). Mặc định mở ngày hôm nay nếu có bài. */
export function PlanView({ items }: { items: PlanItem[] }) {
  const todayDow = ((new Date().getDay() + 6) % 7) + 1;
  const days = [1, 2, 3, 4, 5, 6, 7];
  const [day, setDay] = useState(items.some((i) => i.dayOfWeek === todayDow) ? todayDow : items[0]?.dayOfWeek ?? 1);
  const list = items.filter((i) => i.dayOfWeek === day).sort((a, b) => a.sortOrder - b.sortOrder);
  const totalSets = list.reduce((a, b) => a + b.sets, 0);

  return (
    <div className="stack">
      <div className="days-tabs">
        {days.map((d) => {
          const n = items.filter((i) => i.dayOfWeek === d).length;
          return (
            <button key={d} className={`${d === day ? 'on' : ''} ${n ? 'has' : ''}`} onClick={() => setDay(d)}>
              {DAYS[d - 1]}{d === todayDow && ' •'}<small>{n ? `${n} bài` : 'Nghỉ'}</small>
            </button>
          );
        })}
      </div>
      <div className="row between">
        <b>{DAY_NAMES[day - 1]}{day === todayDow && <span className="ok"> · Hôm nay</span>}</b>
        {list.length > 0 && <span className="tiny faint">{list.length} bài · {totalSets} hiệp</span>}
      </div>
      {list.length === 0 ? <Empty icon="heart" title="Ngày nghỉ" desc="Nghỉ ngơi cũng là một phần của tập luyện." /> : (
        <div className="stack-sm">
          {list.map((it, idx) => (
            <div key={it.id ?? idx} className="row card" style={{ padding: 14, gap: 14, animation: `rowIn .4s var(--ease-out) ${idx * 0.05}s both` }}>
              <div className="num faint" style={{ width: 22, textAlign: 'center' }}>{idx + 1}</div>
              <div className="muscle-ic" style={{ ['--c' as string]: it.muscleGroup ? muscleColor[it.muscleGroup] : '#00d95b' }}><Icon name="dumbbell" /></div>
              <div className="grow">
                <b>{it.exerciseName}</b>
                <div className="tiny muted">{it.muscleGroup ? muscleLabel[it.muscleGroup] : ''}{it.equipment ? ` · ${it.equipment}` : ''}{it.note ? ` · ${it.note}` : ''}</div>
              </div>
              <div className="row row-wrap" style={{ gap: 6, justifyContent: 'flex-end' }}>
                {it.durationMinutes ? <span className="chip on">{it.durationMinutes} phút</span> : <span className="chip on">{it.sets} × {it.reps}</span>}
                {it.weightKg != null && <span className="chip">{it.weightKg} kg</span>}
                {it.restSeconds != null && <span className="chip"><Icon name="clock" size={12} />{it.restSeconds}s</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
