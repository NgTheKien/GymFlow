import { useState } from 'react';
import { t } from '../i18n';

// Biểu đồ SVG tự vẽ: không cần thư viện, có animation và tooltip khi rê chuột.
const W = 640;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

interface Tip { x: number; y: number; text: string }

export function LineChart({ points, height = 220, color = '#00d95b', format = (n) => String(n), minZero = false }: {
  points: { label: string; value: number }[]; height?: number; color?: string; format?: (n: number) => string; minZero?: boolean;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  if (points.length === 0) return <div className="muted small">{t('Chưa có dữ liệu')}</div>;
  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const vals = points.map((p) => p.value);
  let lo = minZero ? 0 : Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) { hi += 1; lo = Math.max(minZero ? 0 : lo - 1, minZero ? 0 : -Infinity); }
  const span = hi - lo; lo -= minZero ? 0 : span * 0.15; hi += span * 0.15;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1)},${height - pad.b} L${x(0)},${height - pad.b} Z`;
  const ticks = [0, 0.5, 1].map((t) => lo + t * (hi - lo));
  const every = Math.ceil(points.length / 8);
  const gid = `lg-${color.replace('#', '')}`;
  return (
    <div className="chart-box">
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" onMouseLeave={() => setTip(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">{format(Math.round(t * 10) / 10)}</text>
          </g>
        ))}
        <path className="area" d={area} fill={`url(#${gid})`} />
        <path className="line" d={d} stroke={color} />
        {points.map((p, i) => (
          <g key={i}>
            <circle className="dot" cx={x(i)} cy={y(p.value)} r={points.length > 20 ? 2.5 : 4} stroke={color} strokeWidth="2" style={{ fill: 'var(--chart-dot)', animationDelay: `${0.6 + i * 0.03}s` }} />
            {i % every === 0 && <text className="axis" x={x(i)} y={height - 6} textAnchor="middle">{p.label}</text>}
            <rect className="hit" x={x(i) - 14} y={pad.t} width={28} height={height - pad.t - pad.b}
              onMouseEnter={() => setTip({ x: (x(i) / W) * 100, y: (y(p.value) / height) * 100, text: `${p.label}: ${format(p.value)}` })} />
          </g>
        ))}
      </svg>
      {tip && <div className="chart-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>{tip.text}</div>}
    </div>
  );
}

export function BarChart({ data, height = 220, color = '#00b24b', highlightLast = true, format = (n) => String(n) }: {
  data: { label: string; value: number }[]; height?: number; color?: string; highlightLast?: boolean; format?: (n: number) => string;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  if (data.length === 0) return <div className="muted small">{t('Chưa có dữ liệu')}</div>;
  const pad = { l: 44, r: 8, t: 14, b: 26 };
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  return (
    <div className="chart-box">
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} />
            <text className="axis" x={pad.l - 8} y={y(max * t) + 4} textAnchor="end">{format(max * t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(0, height - pad.b - y(d.value));
          const last = highlightLast && i === data.length - 1;
          return (
            <g key={i} onMouseEnter={() => setTip({ x: ((pad.l + bw * i + bw / 2) / W) * 100, y: (y(d.value) / height) * 100, text: `${d.label}: ${format(d.value)}` })}>
              <rect className="bar" x={pad.l + bw * i + bw * 0.18} y={y(d.value)} width={bw * 0.64} height={h} rx={6}
                fill={last ? '#00d95b' : color} opacity={last ? 1 : 0.75} style={{ animationDelay: `${i * 0.05}s` }} />
              <text className="axis" x={pad.l + bw * i + bw / 2} y={height - 6} textAnchor="middle">{d.label}</text>
              <rect className="hit" x={pad.l + bw * i} y={pad.t} width={bw} height={height - pad.t - pad.b} />
            </g>
          );
        })}
      </svg>
      {tip && <div className="chart-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>{tip.text}</div>}
    </div>
  );
}

/** Cột chồng 2 lớp (VD: hoàn thành / vắng theo tuần). */
export function StackedBars({ data, height = 200, series }: {
  data: { label: string; values: number[] }[]; height?: number; series: { name: string; color: string }[];
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const pad = { l: 30, r: 8, t: 12, b: 26 };
  const max = niceMax(Math.max(1, ...data.map((d) => d.values.reduce((a, b) => a + b, 0))));
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  const hOf = (v: number) => (v / max) * (height - pad.t - pad.b);
  return (
    <div className="chart-box">
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={height - pad.b - hOf(max * t)} y2={height - pad.b - hOf(max * t)} />
            <text className="axis" x={pad.l - 6} y={height - pad.b - hOf(max * t) + 4} textAnchor="end">{Math.round(max * t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          let acc = 0;
          return (
            <g key={i} onMouseEnter={() => setTip({ x: ((pad.l + bw * i + bw / 2) / W) * 100, y: 20, text: `${d.label}: ` + series.map((s, k) => `${s.name} ${d.values[k]}`).join(' · ') })}>
              {d.values.map((v, k) => {
                const h = hOf(v); const yTop = height - pad.b - acc - h; acc += h;
                return v > 0 ? <rect key={k} className="bar" x={pad.l + bw * i + bw * 0.2} y={yTop} width={bw * 0.6} height={h} rx={4} fill={series[k].color} style={{ animationDelay: `${i * 0.05}s` }} /> : null;
              })}
              <text className="axis" x={pad.l + bw * i + bw / 2} y={height - 6} textAnchor="middle">{d.label}</text>
              <rect className="hit" x={pad.l + bw * i} y={pad.t} width={bw} height={height - pad.t - pad.b} />
            </g>
          );
        })}
      </svg>
      {tip && <div className="chart-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>{tip.text}</div>}
      <div className="legend mt-8">{series.map((s) => <span key={s.name}><i style={{ ['--c' as string]: s.color }} />{s.name}</span>)}</div>
    </div>
  );
}

export const PALETTE = ['#00d95b', '#3d97ff', '#ffb020', '#8b7cff', '#ff6b61', '#00c2ff', '#ff4fa3'];

export function Donut({ data, size = 180, center, sub }: { data: { label: string; value: number }[]; size?: number; center?: string; sub?: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = 70; const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="row row-wrap" style={{ gap: 20, alignItems: 'center' }}>
      <svg viewBox="0 0 180 180" width={size} height={size} role="img" style={{ flex: 'none' }}>
        <circle cx="90" cy="90" r={r} fill="none" style={{ stroke: 'var(--chart-track)' }} strokeWidth="18" />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={i} className="ring-arc" cx="90" cy="90" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="18"
            strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)" />;
          offset += len;
          return el;
        })}
        <text className="ring-label" x="90" y="92" textAnchor="middle">{center ?? total}</text>
        {sub && <text className="ring-sub" x="90" y="112" textAnchor="middle">{sub}</text>}
      </svg>
      <div className="stack-sm grow" style={{ minWidth: 140 }}>
        {data.map((d, i) => (
          <div key={d.label} className="row between small">
            <span className="row" style={{ gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], display: 'inline-block' }} />{d.label}</span>
            <span className="num">{d.value}{total > 0 && <span className="faint"> · {Math.round((d.value / total) * 100)}%</span>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Ring({ value, max = 100, size = 120, label, sub, color = '#00d95b' }: { value: number; max?: number; size?: number; label?: string; sub?: string; color?: string }) {
  const r = 50; const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label}>
      <circle cx="60" cy="60" r={r} fill="none" style={{ stroke: 'var(--chart-track)' }} strokeWidth="10" />
      <circle className="ring-arc" cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 60 60)" />
      <text className="ring-label" x="60" y={sub ? 62 : 68} textAnchor="middle" style={{ fontSize: 20 }}>{label ?? `${Math.round(pct * 100)}%`}</text>
      {sub && <text className="ring-sub" x="60" y="80" textAnchor="middle">{sub}</text>}
    </svg>
  );
}
