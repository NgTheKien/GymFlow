import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Article, ArticleCategory, ArticleSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';
import { HealthDisclaimer, Prose, SourceList } from '../components/Content';
import { Icon } from '../components/Icon';
import { Empty, ErrorState, LoadingBlock, SearchInput } from '../components/ui';
import { articleCategoryLabel, fmtDateTime } from '../lib/format';
import { useAsync, useDebounced } from '../lib/hooks';
import { ThemeToggle } from '../theme/ThemeToggle';
import { t, ViOnlyNote } from '../i18n';

const CATEGORIES = Object.keys(articleCategoryLabel) as ArticleCategory[];

function PublicNav() {
  const { user } = useAuth();
  return (
    <nav className="landing-nav">
      <Link to="/" aria-label={`GymFlow – ${t('trang chủ')}`}><Brand /></Link>
      <div style={{ flex: 1 }} />
      <ThemeToggle />
      <Link className="btn btn-ghost btn-sm" to="/knowledge"><Icon name="layers" />{t('Kho kiến thức')}</Link>
      {user
        ? <Link className="btn btn-primary btn-sm" to="/dashboard"><span>{t('Vào ứng dụng')}</span></Link>
        : <Link className="btn btn-ghost btn-sm" to="/"><Icon name="arrowLeft" />{t('Trang chủ')}</Link>}
    </nav>
  );
}

/** /knowledge – chỉ liệt kê bài đã được quản lý duyệt và xuất bản. */
export function KnowledgeList() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'' | ArticleCategory>('');
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useAsync(() => api.get<ArticleSummary[]>('/articles/public', { q: dq, category: cat }), [dq, cat]);

  return (
    <div className="public">
      <PublicNav />
      <main className="section page legal-page">
        <div className="kicker">{t('Kho kiến thức')}</div>
        <h1 className="display-sm">{t('Ăn, ngủ, tập đúng cách')}</h1>
        <p className="lead">{t('Bài viết ngắn về dinh dưỡng, nước uống, giấc ngủ và vận động. Mỗi bài ghi rõ nguồn tham khảo và chỉ xuất hiện sau khi quản lý phòng tập duyệt.')}</p>

        <div className="toolbar mt-24">
          <SearchInput value={q} onChange={setQ} placeholder="Tìm bài viết…" />
        </div>
        <div className="chips" style={{ marginBottom: 18 }}>
          <button className={`chip ${cat === '' ? 'on' : ''}`} onClick={() => setCat('')}>{t('Tất cả')}</button>
          {CATEGORIES.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{articleCategoryLabel[c]}</button>)}
        </div>

        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <LoadingBlock rows={4} /> : data && data.length === 0 ? (
          <Empty icon="layers" title="Chưa có bài viết nào được xuất bản" desc="Các bài viết đang được quản lý phòng tập duyệt nội dung và nguồn." />
        ) : (
          <div className="article-grid">
            {data?.map((a) => (
              <Link key={a.id} to={`/knowledge/${a.slug}`} className="article-card">
                <span className="kicker">{articleCategoryLabel[a.category]}</span>
                <h2>{a.title}</h2>
                <p className="small muted">{a.summary}</p>
                <span className="link-btn small">{t('Đọc bài')} <Icon name="arrowRight" size={14} /></span>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-24"><HealthDisclaimer /></div>
      </main>
    </div>
  );
}

/** /knowledge/:slug – bài đã xuất bản; bài chưa duyệt trả 404 từ backend. */
export function KnowledgeArticle() {
  const { slug = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => api.get<Article>(`/articles/public/${encodeURIComponent(slug)}`), [slug]);

  return (
    <div className="public">
      <PublicNav />
      <main className="section page legal-page">
        <Link className="muted small" to="/knowledge"><Icon name="arrowLeft" size={14} style={{ display: 'inline', verticalAlign: -2 }} /> {t('Tất cả bài viết')}</Link>
        {error ? (
          error === t('Không tìm thấy bài viết')
            ? <div className="mt-24"><Empty icon="layers" title="Không tìm thấy bài viết" desc="Bài viết không tồn tại hoặc chưa được xuất bản." /></div>
            : <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? <LoadingBlock rows={6} /> : (
          <article className="mt-16">
            <div className="kicker">{articleCategoryLabel[data.category]}</div>
            <h1 className="display-sm">{data.title}</h1>
            <p className="lead" lang="vi">{data.summary}</p>
            <ViOnlyNote />
            <p className="tiny faint">{t('Xuất bản {d}', { d: fmtDateTime(data.publishedAt) })}{data.updatedAt && ` · ${t('Cập nhật {d}', { d: fmtDateTime(data.updatedAt) })}`}</p>
            <div className="mt-16"><HealthDisclaimer /></div>
            <div className="mt-24"><Prose text={data.body} /></div>
            <section className="mt-24">
              <h2>{t('Nguồn tham khảo')}</h2>
              <SourceList sources={data.sources} origin={data.contentOrigin} />
            </section>
          </article>
        )}
      </main>
    </div>
  );
}

