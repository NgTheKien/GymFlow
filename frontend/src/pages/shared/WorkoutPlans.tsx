import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { PlanStatus, WorkoutPlanSummary } from '../../api/types';
import { Card, Empty, ErrorState, LoadingBlock, PageHead, Pager, Person, SearchInput, Segmented, StatusBadge, Button } from '../../components/ui';
import { fmtDate, planStatus, relativeTime } from '../../lib/format';
import { useAsync, usePaged } from '../../lib/hooks';
import { t } from '../../i18n';

type Filter = 'ALL' | PlanStatus;

export default function WorkoutPlans() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const { data, error, loading, reload } = useAsync(() => api.get<WorkoutPlanSummary[]>('/workout-plans'), []);
  const list = useMemo(() => (data ?? []).filter((p) => (filter === 'ALL' || p.status === filter)
    && (q === '' || (p.name + p.memberName).toLowerCase().includes(q.toLowerCase()))), [data, filter, q]);
  const paged = usePaged(list, 'workout-plans', `${filter}|${q}`);

  return (
    <div className="page">
      <PageHead eyebrow="Huấn luyện" title="Giáo án" desc="Mỗi hội viên có một giáo án đang áp dụng; giáo án mới sẽ tự chuyển giáo án cũ sang lưu trữ."
        actions={<Button variant="primary" icon="plus" onClick={() => navigate('/workout-plans/new')}>Soạn giáo án</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên giáo án, hội viên…" />
        <div className="spacer" />
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'ACTIVE', label: 'Đang áp dụng' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'ARCHIVED', label: 'Lưu trữ' }, { value: 'ALL', label: 'Tất cả' },
        ]} />
      </div>
      <Card flush>
        {error ? <div style={{ padding: 20 }}><ErrorState message={error} onRetry={reload} /></div> : loading ? <div style={{ padding: 20 }}><LoadingBlock /></div>
          : list.length === 0 ? <Empty icon="clipboard" title="Không có giáo án" desc="Bấm “Soạn giáo án” để bắt đầu." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>{t('Giáo án')}</th><th>{t('Hội viên')}</th><th>{t('HLV')}</th><th>{t('Thời gian')}</th><th>{t('Nội dung')}</th><th>{t('Trạng thái')}</th></tr></thead>
                <tbody>
                  {paged.items.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`/workout-plans/${p.id}`)}>
                      <td><b>{p.name}</b><div className="tiny faint">{t('Tạo {d}', { d: relativeTime(p.createdAt) })}</div></td>
                      <td><Person name={p.memberName} size="sm" /></td>
                      <td className="muted">{p.trainerName ?? '—'}</td>
                      <td className="small nowrap">{fmtDate(p.startDate)} → {fmtDate(p.endDate)}</td>
                      <td className="small">{t('{d} ngày/tuần · {n} bài', { d: p.trainingDays, n: p.itemCount })}</td>
                      <td><StatusBadge map={planStatus} value={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {list.length > 0 && <Pager page={paged.page} totalPages={paged.totalPages} total={paged.total} onPage={paged.setPage} size={paged.size} sizes={[10, 20, 50]} onSize={paged.setSize} />}
      </Card>
    </div>
  );
}
