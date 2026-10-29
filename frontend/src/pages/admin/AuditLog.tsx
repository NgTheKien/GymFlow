import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { AuditEntry, Page } from '../../api/types';
import { Badge, Button, Card, Empty, ErrorState, Input, LoadingBlock, PageHead, Pager, SearchInput, Select } from '../../components/ui';
import { downloadCsv } from '../../lib/csv';
import { actionLabel, fmtDateTime } from '../../lib/format';
import { useAsync, useDebounced } from '../../lib/hooks';
import { t } from '../../i18n';

export default function AuditLog() {
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [action, setAction] = useState(params.get('action') ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q);
  useEffect(() => setPage(0), [dq, action, from, to]);
  const actions = useAsync(() => api.get<string[]>('/audit-logs/actions'), []);
  const { data, error, loading, reload } = useAsync(() => api.get<Page<AuditEntry>>('/audit-logs', { q: dq, action, from, to, page, size: 30 }), [dq, action, from, to, page]);

  return (
    <div className="page">
      <PageHead eyebrow="Hệ thống" title="Nhật ký hệ thống" desc="Ai làm gì, lúc nào, từ đâu. Nhật ký được ghi trong giao dịch riêng nên vẫn còn kể cả khi thao tác thất bại."
        actions={<Button icon="download" disabled={!data?.content.length} onClick={() => data && downloadCsv('nhat-ky', data.content, [
          { header: t('Thời gian'), value: (a) => a.createdAt }, { header: t('Người thực hiện'), value: (a) => a.actorEmail }, { header: t('Hành động'), value: (a) => actionLabel[a.action] ?? a.action },
          { header: t('Đối tượng'), value: (a) => `${a.targetType ?? ''} ${a.targetId ?? ''}`.trim() }, { header: t('Chi tiết'), value: (a) => a.detail }, { header: t('Kết quả'), value: (a) => t(a.success ? 'Thành công' : 'Thất bại') }, { header: 'IP', value: (a) => a.ip },
        ])}>Xuất trang này</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm email, nội dung…" />
        <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Hành động">
          <option value="">{t('Mọi hành động')}</option>
          {actions.data?.map((a) => <option key={a} value={a}>{actionLabel[a] ?? a}</option>)}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 160 }} aria-label="Từ ngày" />
        <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ width: 160 }} aria-label="Đến ngày" />
      </div>
      <Card flush>
        {error ? <div style={{ padding: 20 }}><ErrorState message={error} onRetry={reload} /></div> : loading && !data ? <div style={{ padding: 20 }}><LoadingBlock /></div>
          : data && data.content.length === 0 ? <Empty icon="scroll" title="Không có bản ghi" /> : data && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('Thời gian')}</th><th>{t('Người thực hiện')}</th><th>{t('Hành động')}</th><th>{t('Chi tiết')}</th><th>{t('Kết quả')}</th><th>IP</th></tr></thead>
                  <tbody>
                    {data.content.map((a) => (
                      <tr key={a.id}>
                        <td className="tiny nowrap muted">{fmtDateTime(a.createdAt)}</td>
                        <td className="small">{a.actorEmail ?? <span className="faint">{t('hệ thống')}</span>}</td>
                        <td><b className="small">{actionLabel[a.action] ?? a.action}</b>{a.targetType && <div className="tiny faint">{a.targetType} #{a.targetId}</div>}</td>
                        <td className="small muted" style={{ maxWidth: 360 }}>{a.detail ?? ''}</td>
                        <td>{a.success ? <Badge tone="green">OK</Badge> : <Badge tone="red">Thất bại</Badge>}</td>
                        <td className="tiny faint">{a.ip ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
            </>
          )}
      </Card>
    </div>
  );
}
