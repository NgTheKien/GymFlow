import { api } from '../../api/client';
import type { WorkoutPlan } from '../../api/types';
import { PlanView } from '../../components/PlanView';
import { Card, Empty, ErrorState, LoadingBlock, PageHead, StatusBadge } from '../../components/ui';
import { t } from '../../i18n';
import { fmtDate, planStatus } from '../../lib/format';
import { useAsync } from '../../lib/hooks';

export default function MyPlan() {
  const { data, error, loading, reload } = useAsync(() => api.get<WorkoutPlan | undefined>('/workout-plans/me/current'), []);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <div className="page"><PageHead title="Giáo án của tôi" /><LoadingBlock rows={6} /></div>;
  if (!data) {
    return (
      <div className="page">
        <PageHead eyebrow="Tập luyện" title="Giáo án của tôi" />
        <Card><Empty icon="clipboard" title="Bạn chưa có giáo án" desc="Huấn luyện viên sẽ soạn giáo án phù hợp với mục tiêu của bạn." /></Card>
      </div>
    );
  }
  const s = data.summary;
  return (
    <div className="page">
      <PageHead eyebrow="Tập luyện" title={s.name}
        desc={t('HLV {name} · {from} → {to} · {n} buổi/tuần', { name: s.trainerName ?? '—', from: fmtDate(s.startDate), to: fmtDate(s.endDate), n: s.trainingDays })}
        actions={<StatusBadge map={planStatus} value={s.status} />} />
      <div className="grid grid-main" style={{ alignItems: 'start' }}>
        <Card title="Lịch bài tập theo ngày" icon="calendar"><PlanView items={data.items} /></Card>
        <Card title="Mục tiêu & lưu ý" icon="target">
          <div className="stack">
            <div><div className="tiny faint">{t('Mục tiêu')}</div><b>{s.goal ?? '—'}</b></div>
            {data.note && <div><div className="tiny faint">{t('Lời dặn của HLV')}</div><p className="small muted mt-4" style={{ whiteSpace: 'pre-line' }}>{data.note}</p></div>}
            <div className="divider" />
            <div className="tiny faint">{t('Tổng cộng {n} bài trong tuần. Sau mỗi buổi, vào “Lịch tập” để đánh dấu hoàn thành.', { n: s.itemCount })}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
