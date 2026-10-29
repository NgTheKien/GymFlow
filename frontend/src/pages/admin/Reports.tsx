import { useState } from 'react';
import { api } from '../../api/client';
import type { Report } from '../../api/types';
import { BarChart, Donut, LineChart } from '../../components/charts';
import { Button, Card, ErrorState, Field, Input, LoadingBlock, Meter, PageHead, Segmented, Stat } from '../../components/ui';
import { downloadCsv } from '../../lib/csv';
import { addDays, fmtMoney, fmtMoneyShort, genderLabel, memberStatus, toIsoDate } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { t } from '../../i18n';

type Range = '30' | '90' | '180' | '365' | 'custom';

export default function Reports() {
  const today = new Date();
  const [range, setRange] = useState<Range>('180');
  const [from, setFrom] = useState(toIsoDate(addDays(today, -179)));
  const [to, setTo] = useState(toIsoDate(today));
  const pick = (r: Range) => { setRange(r); if (r !== 'custom') { setFrom(toIsoDate(addDays(new Date(), -Number(r) + 1))); setTo(toIsoDate(new Date())); } };
  const { data, error, loading, reload } = useAsync(() => api.get<Report>('/reports/summary', { from, to }), [from, to]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ...data.revenueByMonth.map((r) => ({ group: t('Doanh thu theo tháng'), label: r.label, value: r.value })),
      ...data.revenueByPlan.map((r) => ({ group: t('Doanh thu theo gói'), label: r.label, value: r.value })),
      ...data.byTrainer.map((tr) => ({ group: t('Buổi tập theo HLV'), label: tr.trainerName, value: t('{c}/{n} (vắng {m})', { c: tr.completed, n: tr.total, m: tr.missed }) })),
      ...data.newMembersByMonth.map((r) => ({ group: t('Hội viên mới'), label: r.label, value: r.value })),
    ];
    downloadCsv(`bao-cao-${data.from}-${data.to}`, rows, [{ header: t('Nhóm'), value: (r) => r.group }, { header: t('Mục'), value: (r) => r.label }, { header: t('Giá trị'), value: (r) => r.value }]);
  };

  return (
    <div className="page">
      <PageHead eyebrow="Kinh doanh" title="Báo cáo" desc="Doanh thu tính theo ngày thu tiền (không gồm gói đã huỷ). Chuyên cần = hoàn thành / (hoàn thành + vắng)."
        actions={<Button icon="download" disabled={!data} onClick={exportCsv}>Xuất CSV</Button>} />
      <div className="toolbar">
        <Segmented<Range> value={range} onChange={pick} options={[
          { value: '30', label: '30 ngày' }, { value: '90', label: '3 tháng' }, { value: '180', label: '6 tháng' }, { value: '365', label: '12 tháng' }, { value: 'custom', label: 'Tuỳ chọn' },
        ]} />
        {range === 'custom' && <>
          <Field><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Từ ngày" /></Field>
          <Field><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="Đến ngày" /></Field>
        </>}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <LoadingBlock rows={8} /> : (
        <div className="stack" style={{ gap: 18 }}>
          <div className="grid grid-4">
            <Stat icon="wallet" label="Doanh thu" value={fmtMoneyShort(data.revenueTotal)} foot={fmtMoney(data.revenueTotal)} />
            <Stat icon="card" label="Lượt đăng ký" value={data.subscriptionCount} accent="#3d97ff" foot={data.subscriptionCount ? t('TB {v}/lượt', { v: fmtMoney(Math.round(data.revenueTotal / data.subscriptionCount)) }) : '—'} />
            <Stat icon="calendar" label="Buổi tập đã xếp" value={data.scheduled} accent="#8b7cff" foot={t('{c} hoàn thành · {m} vắng · {x} huỷ', { c: data.completed, m: data.missed, x: data.cancelled })} />
            <Stat icon="target" label="Chuyên cần" value={data.attendanceRate ?? '—'} unit={data.attendanceRate != null ? '%' : undefined} accent="#ffb020" foot="Tính trên buổi đã diễn ra" />
          </div>
          <div className="grid grid-main">
            <Card title="Doanh thu theo tháng" icon="chart"><BarChart data={data.revenueByMonth.map((r) => ({ label: r.label.slice(0, 5), value: r.value }))} format={fmtMoneyShort} /></Card>
            <Card title="Theo gói tập" icon="layers"><Donut data={data.revenueByPlan.map((r) => ({ label: r.label, value: Math.round(r.value / 1000) }))} center={fmtMoneyShort(data.revenueTotal)} sub={t('nghìn ₫')} /></Card>
          </div>
          <div className="grid grid-2">
            <Card title="Buổi tập theo HLV" icon="badge">
              {data.byTrainer.length === 0 ? <p className="muted small">{t('Không có buổi tập trong khoảng này.')}</p> : (
                <div className="stack">
                  {data.byTrainer.map((tr) => {
                    const rate = tr.completed + tr.missed ? Math.round((tr.completed / (tr.completed + tr.missed)) * 100) : 0;
                    return (
                      <div key={tr.trainerId}>
                        <div className="row between small"><b>{tr.trainerName}</b><span className="muted">{t('{c}/{n} buổi', { c: tr.completed, n: tr.total })} · <span className={rate >= 75 ? 'ok' : 'warn'}>{rate}%</span></span></div>
                        <div className="mt-4"><Meter value={rate} color={rate >= 75 ? undefined : 'var(--warning)'} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card title="Hội viên mới theo tháng" icon="users"><LineChart points={data.newMembersByMonth.map((r) => ({ label: r.label.slice(0, 5), value: r.value }))} minZero color="#3d97ff" /></Card>
          </div>
          <div className="grid grid-2">
            <Card title="Trạng thái hội viên" icon="activity"><Donut data={data.membersByStatus.map((r) => ({ label: memberStatus[r.label as keyof typeof memberStatus]?.[0] ?? r.label, value: r.value }))} sub={t('hội viên')} /></Card>
            <Card title="Giới tính" icon="user"><Donut data={data.membersByGender.map((r) => ({ label: genderLabel[r.label as keyof typeof genderLabel] ?? t('Chưa rõ'), value: r.value }))} sub={t('hội viên')} /></Card>
          </div>
        </div>
      )}
    </div>
  );
}
