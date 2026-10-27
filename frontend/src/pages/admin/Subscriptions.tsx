import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Subscription, SubscriptionState } from '../../api/types';
import { SubscriptionForm } from '../../components/SubscriptionForm';
import { Button, Card, Empty, ErrorState, LoadingBlock, PageHead, Person, SearchInput, Segmented, Stat, StatusBadge } from '../../components/ui';
import { downloadCsv } from '../../lib/csv';
import { fmtDate, fmtDateTime, fmtMoney, fmtMoneyShort, subState } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { CancelSubscription } from '../shared/MemberDetail';

type Filter = 'ALL' | SubscriptionState;

export default function Subscriptions() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>((params.get('state') as Filter) ?? 'ALL');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<Subscription | null>(null);
  const { data, error, loading, reload } = useAsync(() => api.get<Subscription[]>('/subscriptions'), []);

  const list = useMemo(() => (data ?? []).filter((s) => (filter === 'ALL' || s.state === filter)
    && (!q || `${s.memberName} ${s.memberCode} ${s.planName}`.toLowerCase().includes(q.toLowerCase()))), [data, filter, q]);
  const count = (st: SubscriptionState) => (data ?? []).filter((s) => s.state === st).length;
  const month = new Date().toISOString().slice(0, 7);
  const monthRevenue = (data ?? []).filter((s) => !s.cancelled && s.createdAt.startsWith(month)).reduce((a, s) => a + s.pricePaid, 0);

  const changeFilter = (f: Filter) => { setFilter(f); if (f === 'ALL') params.delete('state'); else params.set('state', f); setParams(params, { replace: true }); };

  return (
    <div className="page">
      <PageHead eyebrow="Kinh doanh" title="Đăng ký gói" desc="Đăng ký mới, gia hạn nối tiếp và huỷ gói. CSDL chặn mọi trường hợp hai gói chồng thời gian."
        actions={<>
          <Button icon="download" onClick={() => downloadCsv('dang-ky-goi', list, [
            { header: 'Mã HV', value: (s) => s.memberCode }, { header: 'Hội viên', value: (s) => s.memberName }, { header: 'Gói', value: (s) => s.planName },
            { header: 'Bắt đầu', value: (s) => s.startDate }, { header: 'Kết thúc', value: (s) => s.endDate }, { header: 'Số tiền', value: (s) => s.pricePaid },
            { header: 'Trạng thái', value: (s) => subState[s.state][0] }, { header: 'Ngày thu', value: (s) => s.createdAt.slice(0, 10) }, { header: 'Người tạo', value: (s) => s.createdByName },
          ])}>Xuất CSV</Button>
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Đăng ký gói</Button>
        </>} />

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat icon="checkCircle" label="Còn hiệu lực" value={count('ACTIVE')} />
        <Stat icon="clock" label="Sắp hết hạn" value={count('EXPIRING')} accent="#ffb020" />
        <Stat icon="calendar" label="Sắp bắt đầu" value={count('UPCOMING')} accent="#3d97ff" />
        <Stat icon="wallet" label="Thu trong tháng" value={fmtMoneyShort(monthRevenue)} accent="#8b7cff" foot={fmtMoney(monthRevenue)} />
      </div>

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm hội viên, mã, gói…" />
        <div className="spacer" />
        <Segmented<Filter> value={filter} onChange={changeFilter} options={[
          { value: 'ALL', label: 'Tất cả' }, { value: 'ACTIVE', label: 'Hiệu lực' }, { value: 'EXPIRING', label: `Sắp hết ${count('EXPIRING')}` },
          { value: 'UPCOMING', label: 'Sắp bắt đầu' }, { value: 'EXPIRED', label: 'Hết hạn' }, { value: 'CANCELLED', label: 'Đã huỷ' },
        ]} />
      </div>

      <Card flush>
        {error ? <div style={{ padding: 20 }}><ErrorState message={error} onRetry={reload} /></div> : loading ? <div style={{ padding: 20 }}><LoadingBlock /></div>
          : list.length === 0 ? <Empty icon="card" title="Không có đăng ký phù hợp" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Hội viên</th><th>Gói</th><th>Thời gian</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày thu</th><th /></tr></thead>
                <tbody>
                  {list.slice(0, 300).map((s) => (
                    <tr key={s.id}>
                      <td className="clickable" onClick={() => navigate(`/members/${s.memberId}`)}><Person name={s.memberName} sub={s.memberCode} size="sm" /></td>
                      <td>{s.planName}</td>
                      <td className="small nowrap">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</td>
                      <td className="num">{fmtMoney(s.pricePaid)}</td>
                      <td><StatusBadge map={subState} value={s.state} />{(s.state === 'ACTIVE' || s.state === 'EXPIRING') && <div className="tiny faint mt-4">còn {s.daysLeft} ngày</div>}</td>
                      <td className="tiny muted nowrap">{fmtDateTime(s.createdAt)}<div className="faint">{s.createdByName ?? ''}</div></td>
                      <td className="actions">{!s.cancelled && s.state !== 'EXPIRED' && <Button size="sm" variant="ghost" icon="ban" aria-label="Huỷ" title="Huỷ gói" onClick={() => setCancelling(s)} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      {creating && <SubscriptionForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void reload(); }} />}
      {cancelling && <CancelSubscription sub={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); void reload(); }} />}
    </div>
  );
}
