import { useState } from 'react';
import { t } from '../i18n';
import { api } from '../api/client';
import type { Progress, Weight } from '../api/types';
import { fmtDate, fmtDateShort, fmtNum, todayIso } from '../lib/format';
import { errMsg, fieldErrs, useAsync } from '../lib/hooks';
import { LineChart, Ring, StackedBars } from './charts';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, Stat, Textarea } from './ui';

const BMI_SCALE = [
  { to: 18.5, label: 'Thiếu cân', color: '#3d97ff' },
  { to: 23, label: 'Bình thường', color: '#00d95b' },
  { to: 25, label: 'Thừa cân', color: '#ffb020' },
  { to: 30, label: 'Béo phì I', color: '#ff8a3d' },
  { to: 40, label: 'Béo phì II', color: '#ff3b30' },
];

function BmiBar({ bmi }: { bmi: number }) {
  const min = 14; const max = 40;
  const pos = Math.max(0, Math.min(100, ((bmi - min) / (max - min)) * 100));
  let prev = min;
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden' }}>
        {BMI_SCALE.map((s) => { const w = ((s.to - prev) / (max - min)) * 100; prev = s.to; return <div key={s.label} style={{ width: `${w}%`, background: s.color, opacity: 0.85 }} />; })}
      </div>
      <div style={{ position: 'relative', height: 18 }}>
        <div style={{ position: 'absolute', left: `${pos}%`, transform: 'translateX(-50%)', top: 2, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '8px solid var(--ink)', transition: 'left 1s var(--ease-out)' }} />
      </div>
      <div className="row between tiny faint"><span>14</span><span>18.5</span><span>23</span><span>25</span><span>30</span><span>40</span></div>
    </div>
  );
}

/** Tiến độ của một hội viên: dùng ở trang "Tiến độ" của hội viên và trang chi tiết hội viên của HLV/quản lý. */
export function ProgressPanel({ memberId, canEdit = true }: { memberId: number; canEdit?: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get<Progress>(`/members/${memberId}/progress`), [memberId]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Weight | null>(null);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingBlock rows={5} />;
  const change = data.weightChange;
  const weeks = data.attendance.map((w) => ({ label: fmtDateShort(w.weekStart), values: [w.completed, w.missed, Math.max(0, w.scheduled - w.completed - w.missed)] }));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="grid grid-4">
        <Stat icon="scale" label="Cân nặng hiện tại" value={fmtNum(data.currentWeight, 1)} unit={data.currentWeight != null ? 'kg' : undefined}
          foot={change == null ? 'Chưa có số liệu' : <span className={change <= 0 ? 'trend-up' : 'trend-down'}>{t('{v} kg từ lần đầu', { v: (change > 0 ? '+' : '') + fmtNum(change, 1) })}</span>} />
        <Stat icon="heart" label="BMI" value={fmtNum(data.bmi, 1)} accent="#ffb020" foot={data.bmiCategory ?? (data.heightCm ? '—' : 'Cần cập nhật chiều cao')} />
        <Stat icon="flame" label="Chuỗi tuần tập" value={data.streakWeeks} unit="tuần" accent="#ff6b61" foot={t('{n} buổi · {m} phút', { n: data.totalSessions, m: fmtNum(data.totalMinutes) })} />
        <Stat icon="zap" label="Calo đã đốt" value={fmtNum(data.totalCalories)} unit="kcal" accent="#8b7cff" foot={data.avgRating ? t('Cảm nhận TB {n}/5', { n: data.avgRating }) : 'Chưa có đánh giá'} />
      </div>

      <div className="grid grid-main">
        <Card title="Cân nặng theo thời gian" icon="trendDown" actions={canEdit && <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>Ghi cân nặng</Button>}>
          {data.weights.length === 0 ? <Empty icon="scale" title="Chưa có số liệu cân nặng" desc="Ghi lại mỗi tuần để thấy tiến độ." /> : (
            <LineChart points={data.weights.map((w) => ({ label: fmtDateShort(w.recordedDate), value: w.weightKg }))} format={(n) => `${n}`} />
          )}
          {data.weights.some((w) => w.bodyFat != null) && (
            <div className="mt-16">
              <div className="tiny faint" style={{ marginBottom: 6 }}>{t('Tỉ lệ mỡ (%)')}</div>
              <LineChart height={140} color="#ffb020" points={data.weights.filter((w) => w.bodyFat != null).map((w) => ({ label: fmtDateShort(w.recordedDate), value: w.bodyFat as number }))} />
            </div>
          )}
        </Card>
        <Card title="Chỉ số cơ thể" icon="heart">
          <div className="row" style={{ justifyContent: 'center' }}>
            <Ring value={data.attendanceRate ?? 0} label={data.attendanceRate == null ? '—' : `${Math.round(data.attendanceRate)}%`} sub={t('chuyên cần 8 tuần')} size={140} />
          </div>
          <div className="mt-16">
            {data.bmi != null ? <BmiBar bmi={data.bmi} /> : <p className="muted small">{t('Cần chiều cao và cân nặng để tính BMI.')}</p>}
            <p className="tiny faint mt-8">{t('Phân loại BMI theo ngưỡng WHO cho người châu Á (bình thường 18,5 – 22,9).')}</p>
          </div>
          <dl className="kv mt-16 small">
            <dt>{t('Chiều cao')}</dt><dd>{data.heightCm ? `${data.heightCm} cm` : '—'}</dd>
            <dt>{t('Cân lần đầu')}</dt><dd>{data.startWeight ? `${data.startWeight} kg` : '—'}</dd>
            <dt>{t('% mỡ gần nhất')}</dt><dd>{data.bodyFat != null ? `${data.bodyFat}%` : '—'}</dd>
          </dl>
        </Card>
      </div>

      <Card title="Chuyên cần 8 tuần gần nhất" icon="calendar">
        <StackedBars data={weeks} series={[{ name: t('Hoàn thành'), color: '#00d95b' }, { name: t('Vắng'), color: '#ff6b61' }, { name: t('Sắp tới'), color: '#3d97ff' }]} />
      </Card>

      {data.weights.length > 0 && (
        <Card title="Nhật ký cân nặng" icon="scroll" flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('Ngày')}</th><th>{t('Cân nặng')}</th><th>{t('% mỡ')}</th><th>{t('Ghi chú')}</th>{canEdit && <th />}</tr></thead>
              <tbody>
                {[...data.weights].reverse().map((w) => (
                  <tr key={w.id}>
                    <td>{fmtDate(w.recordedDate)}</td>
                    <td className="num">{w.weightKg} kg</td>
                    <td>{w.bodyFat != null ? `${w.bodyFat}%` : '—'}</td>
                    <td className="muted">{w.note ?? ''}</td>
                    {canEdit && <td className="actions"><Button size="sm" variant="ghost" icon="trash" aria-label="Xoá" onClick={() => setRemoving(w)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {adding && <WeightForm memberId={memberId} last={data.weights[data.weights.length - 1]} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); void reload(); }} />}
      {removing && <Confirm danger title="Xoá bản ghi cân nặng?" message={t('Bản ghi ngày {d} ({w} kg) sẽ bị xoá.', { d: fmtDate(removing.recordedDate), w: removing.weightKg })} confirmText="Xoá"
        onClose={() => setRemoving(null)} onConfirm={async () => {
          try { await api.del(`/weights/${removing.id}`); toast.success('Đã xoá'); void reload(); } catch (e) { toast.error(errMsg(e)); throw e; }
        }} />}
    </div>
  );
}

function WeightForm({ memberId, last, onClose, onSaved }: { memberId: number; last?: Weight; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState(last ? String(last.weightKg) : '');
  const [fat, setFat] = useState(last?.bodyFat != null ? String(last.bodyFat) : '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v: Record<string, string> = {};
    const w = Number(weight.replace(',', '.')); const f = fat === '' ? null : Number(fat.replace(',', '.'));
    if (!weight || Number.isNaN(w) || w < 20 || w > 300) v.weightKg = 'Cân nặng từ 20 đến 300 kg';
    if (f != null && (Number.isNaN(f) || f < 2 || f > 70)) v.bodyFat = '% mỡ từ 2 đến 70';
    if (date > todayIso()) v.recordedDate = 'Không ghi cho ngày tương lai';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await api.post(`/members/${memberId}/weights`, { recordedDate: date, weightKg: w, bodyFat: f, note: note || null });
      toast.success('Đã lưu cân nặng');
      onSaved();
    } catch (e) { toast.error(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title="Ghi cân nặng" onClose={onClose} size="narrow" footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu</Button>
    </>}>
      <div className="stack">
        <p className="small muted"><Icon name="info" size={14} style={{ display: 'inline', verticalAlign: -2 }} /> {t('Mỗi ngày một bản ghi, ghi lại cùng ngày sẽ cập nhật số cũ.')}</p>
        <Field label="Ngày" error={errors.recordedDate} required><Input type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Cân nặng (kg)" error={errors.weightKg} required><Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="VD: 62.5" /></Field>
          <Field label="% mỡ cơ thể" error={errors.bodyFat} hint="Không bắt buộc"><Input inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="VD: 22" /></Field>
        </div>
        <Field label="Ghi chú"><Textarea maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: đo buổi sáng, trước ăn" /></Field>
      </div>
    </Modal>
  );
}
