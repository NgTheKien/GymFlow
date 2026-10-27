import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Article, ArticleAction, ArticleCategory, ArticleStatus, ContentOrigin, Source } from '../../api/types';
import { useMe } from '../../auth/AuthContext';
import { HealthDisclaimer, Prose, SourceList } from '../../components/Content';
import { useToast } from '../../components/Toast';
import { Alert, Button, Card, Confirm, Empty, ErrorState, Field, Input, LoadingBlock, Modal, PageHead, Select, StatusBadge, Textarea } from '../../components/ui';
import { articleCategoryLabel, articleStatusLabel, fmtDateTime } from '../../lib/format';
import { errMsg, fieldErrs, useAsync } from '../../lib/hooks';
import { t } from '../../i18n';

const CATEGORIES = Object.keys(articleCategoryLabel) as ArticleCategory[];
const STATUSES = Object.keys(articleStatusLabel) as ArticleStatus[];

/** Bỏ dấu tiếng Việt để gợi ý đường dẫn: "Uống đủ nước" → "uong-du-nuoc". */
export const slugify = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

/** /articles – quản lý (duyệt, xuất bản, gỡ) và HLV (soạn, gửi duyệt bài của mình). */
export default function Articles() {
  const me = useMe();
  const isAdmin = me.role === 'ADMIN';
  const [status, setStatus] = useState<'' | ArticleStatus>(isAdmin ? 'PENDING' : '');
  const [editing, setEditing] = useState<Article | 'new' | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const { data, error, loading, reload } = useAsync(() => api.get<Article[]>('/articles', { status }), [status]);
  const viewing = data?.find((a) => a.id === viewingId) ?? null;
  const canEdit = (a: Article) => isAdmin || a.authorId === me.id;

  return (
    <div className="page">
      <PageHead eyebrow="Nội dung" title="Kho kiến thức"
        desc={<>{t('Bài viết chỉ hiện ở trang công khai sau khi quản lý duyệt. Mỗi bài cần ít nhất một nguồn tham khảo.')} <Link to="/knowledge">/knowledge</Link></>}
        actions={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Soạn bài viết</Button>} />
      <div className="chips" style={{ marginBottom: 18 }}>
        <button className={`chip ${status === '' ? 'on' : ''}`} onClick={() => setStatus('')}>{t('Tất cả')}</button>
        {STATUSES.map((s) => <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{articleStatusLabel[s][0]}</button>)}
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <LoadingBlock rows={5} /> : data && data.length === 0 ? (
        <Card><Empty icon="layers" title="Không có bài viết" /></Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('Bài viết')}</th><th>{t('Chủ đề')}</th><th>{t('Trạng thái')}</th><th>{t('Nguồn')}</th><th>{t('Cập nhật')}</th><th aria-label={t('Thao tác')} /></tr></thead>
              <tbody>
                {data?.map((a) => (
                  <tr key={a.id}>
                    <td><b>{a.title}</b><div className="tiny muted">/{a.slug}{a.authorName && ` · ${a.authorName}`}</div></td>
                    <td>{articleCategoryLabel[a.category]}</td>
                    <td><StatusBadge map={articleStatusLabel} value={a.status} /></td>
                    <td>{a.sources.length}</td>
                    <td className="tiny muted">{fmtDateTime(a.updatedAt ?? a.createdAt)}</td>
                    <td className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" icon="eye" aria-label="Xem" onClick={() => setViewingId(a.id)} />
                      {canEdit(a) && <Button size="sm" variant="ghost" icon="edit" aria-label="Sửa" onClick={() => setEditing(a)} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {viewing && <ArticleReview article={viewing} isAdmin={isAdmin} canEdit={canEdit(viewing)} onClose={() => setViewingId(null)} onChanged={() => void reload()} />}
      {editing && <ArticleForm article={editing === 'new' ? undefined : editing} isAdmin={isAdmin} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
    </div>
  );
}

function ArticleReview({ article: a, isAdmin, canEdit, onClose, onChanged }: { article: Article; isAdmin: boolean; canEdit: boolean; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ArticleAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const act = async (action: ArticleAction) => {
    setError(null);
    if (action === 'REJECT' && !note.trim()) { setError('Ghi rõ nội dung cần chỉnh sửa trước khi trả về.'); return; }
    setBusy(action);
    try {
      await api.put(`/articles/${a.id}/status`, { action, note });
      toast.success({ SUBMIT: 'Đã gửi duyệt', APPROVE: 'Đã xuất bản', REJECT: 'Đã trả về bản nháp', ARCHIVE: 'Đã gỡ bài', RESTORE: 'Đã khôi phục về nháp' }[action]);
      setNote('');
      onChanged();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  };

  return (
    <Modal title={a.title} size="wide" onClose={onClose}>
      <div className="stack">
        <div className="row row-wrap">
          <StatusBadge map={articleStatusLabel} value={a.status} />
          <span className="chip">{articleCategoryLabel[a.category]}</span>
          <span className="tiny faint">{a.authorName ? t('Tác giả: {name}', { name: a.authorName }) : t('Dữ liệu khởi tạo')}{a.reviewedByName && ` · ${t('Duyệt bởi {name} lúc {d}', { name: a.reviewedByName, d: fmtDateTime(a.reviewedAt) })}`}</span>
        </div>
        {a.reviewNote && <Alert kind={a.status === 'DRAFT' ? 'warning' : 'info'}>{t('Ghi chú duyệt:')} {a.reviewNote}</Alert>}
        <p className="lead small">{a.summary}</p>
        <HealthDisclaimer pending={a.status !== 'PUBLISHED'} />
        <Prose text={a.body} />
        <div><b className="small">{t('Nguồn tham khảo và giấy phép')}</b><div className="mt-8"><SourceList sources={a.sources} origin={a.contentOrigin} /></div></div>

        <Card title="Thao tác" icon="shield">
          <div className="stack-sm">
            {error && <Alert kind="error">{error}</Alert>}
            {isAdmin && a.status === 'PENDING' && (
              <>
                <p className="tiny muted">{t('Mở từng nguồn để đối chiếu trước khi xuất bản. Xuất bản nghĩa là quản lý phòng tập chấp nhận hiển thị công khai, không phải chuyên gia y tế xác minh.')}</p>
                <Field label="Ghi chú (bắt buộc khi trả về)"><Textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              </>
            )}
            <div className="row row-wrap">
              {a.status === 'DRAFT' && canEdit && <Button variant="primary" icon="arrowRight" loading={busy === 'SUBMIT'} onClick={() => void act('SUBMIT')}>Gửi duyệt</Button>}
              {isAdmin && a.status === 'PENDING' && <Button variant="primary" icon="check" loading={busy === 'APPROVE'} onClick={() => void act('APPROVE')}>Duyệt &amp; xuất bản</Button>}
              {isAdmin && a.status === 'PENDING' && <Button icon="edit" loading={busy === 'REJECT'} onClick={() => void act('REJECT')}>Trả về chỉnh sửa</Button>}
              {isAdmin && a.status === 'PUBLISHED' && <Button icon="eyeOff" loading={busy === 'ARCHIVE'} onClick={() => void act('ARCHIVE')}>Gỡ khỏi trang công khai</Button>}
              {isAdmin && a.status === 'PUBLISHED' && <Link className="btn btn-ghost" to={`/knowledge/${a.slug}`} target="_blank">{t('Xem trang công khai')}</Link>}
              {isAdmin && a.status === 'ARCHIVED' && <Button icon="refresh" loading={busy === 'RESTORE'} onClick={() => void act('RESTORE')}>Khôi phục về nháp</Button>}
              {isAdmin && a.status !== 'PUBLISHED' && <Button variant="ghost" icon="trash" onClick={() => setRemoving(true)}>Xoá</Button>}
              {!isAdmin && a.status === 'PENDING' && <span className="tiny muted">{t('Đang chờ quản lý duyệt.')}</span>}
            </div>
          </div>
        </Card>
      </div>
      {removing && <Confirm danger title="Xoá bài viết?" message={t('"{name}" sẽ bị xoá vĩnh viễn.', { name: a.title })} confirmText="Xoá" onClose={() => setRemoving(false)}
        onConfirm={async () => { try { await api.del(`/articles/${a.id}`); toast.success('Đã xoá'); onClose(); onChanged(); } catch (e) { toast.error(errMsg(e)); throw e; } }} />}
    </Modal>
  );
}

function ArticleForm({ article, isAdmin, onClose, onSaved }: { article?: Article; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const sources = useAsync(() => api.get<Source[]>('/content-sources'), []);
  const [f, setF] = useState({
    title: article?.title ?? '', slug: article?.slug ?? '', category: article?.category ?? ('NUTRITION' as ArticleCategory),
    summary: article?.summary ?? '', body: article?.body ?? '', contentOrigin: article?.contentOrigin ?? ('SELF_AUTHORED' as ContentOrigin),
    sourceIds: article?.sources.map((s) => s.id) ?? ([] as number[]),
  });
  const [slugTouched, setSlugTouched] = useState(!!article);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    const v: Record<string, string> = {};
    if (!f.title.trim()) v.title = 'Nhập tiêu đề';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) v.slug = 'Chỉ gồm chữ thường không dấu, số và dấu gạch ngang';
    if (!f.summary.trim()) v.summary = 'Nhập tóm tắt';
    if (!f.body.trim()) v.body = 'Nhập nội dung';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      if (article) await api.put(`/articles/${article.id}`, f); else await api.post('/articles', f);
      toast.success(article ? 'Đã lưu bài viết' : 'Đã tạo bản nháp');
      onSaved();
    } catch (e) { setError(errMsg(e)); setErrors(fieldErrs(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title={article ? 'Sửa bài viết' : 'Soạn bài viết'} size="wide" onClose={onClose} footer={<>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={busy} onClick={submit}>Lưu</Button>
    </>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {!isAdmin && article?.status === 'PUBLISHED' && <Alert kind="info">Bài đang xuất bản: sau khi lưu sẽ được gỡ khỏi trang công khai và chờ quản lý duyệt lại.</Alert>}
        <div className="form-grid">
          <Field label="Tiêu đề" error={errors.title} required className="span-2">
            <Input maxLength={200} value={f.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} />
          </Field>
          <Field label="Đường dẫn" error={errors.slug} required hint={`/knowledge/${f.slug || '…'}`}>
            <Input maxLength={120} value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
          </Field>
          <Field label="Chủ đề" required>
            <Select value={f.category} onChange={(e) => set('category', e.target.value as ArticleCategory)}>{CATEGORIES.map((c) => <option key={c} value={c}>{articleCategoryLabel[c]}</option>)}</Select>
          </Field>
          <Field label="Tóm tắt" error={errors.summary} required className="span-2"><Textarea maxLength={500} rows={2} value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
          <Field label="Nội dung" error={errors.body} required className="span-2" hint="Dòng trống tách đoạn · “## ” là tiêu đề · “- ” là gạch đầu dòng. Không chẩn đoán bệnh, không ghi số liệu khi chưa có nguồn.">
            <Textarea maxLength={20000} rows={12} value={f.body} onChange={(e) => set('body', e.target.value)} />
          </Field>
          <Field label="Nguồn gốc nội dung" className="span-2">
            <Select value={f.contentOrigin} onChange={(e) => set('contentOrigin', e.target.value as ContentOrigin)}>
              <option value="SELF_AUTHORED">{t('Tự biên soạn')}</option>
              <option value="ADAPTED">{t('Biên soạn lại từ nguồn mở')}</option>
            </Select>
          </Field>
          <div className="span-2">
            <span className="tiny muted">{t('Nguồn tham khảo (cần ít nhất 1 nguồn để xuất bản)')}</span>
            {sources.error ? <Alert kind="error">{sources.error}</Alert> : !sources.data ? <LoadingBlock rows={2} /> : (
              <div className="source-pick mt-8">
                {sources.data.map((s) => (
                  <label key={s.id} className="check">
                    <input type="checkbox" checked={f.sourceIds.includes(s.id)}
                      onChange={() => set('sourceIds', f.sourceIds.includes(s.id) ? f.sourceIds.filter((x) => x !== s.id) : [...f.sourceIds, s.id])} />
                    <span>{s.title} <span className="tiny faint">· {s.publisher}{!s.licenseVerified && ` · ${t('giấy phép chưa xác minh')}`}</span></span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
