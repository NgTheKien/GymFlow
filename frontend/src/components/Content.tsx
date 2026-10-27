import type { ReactNode } from 'react';
import type { ContentOrigin, Source } from '../api/types';
import { t, ViOnlyNote } from '../i18n';
import { fmtDate } from '../lib/format';
import { Icon } from './Icon';
import { Badge } from './ui';

/** Trường chưa có thông tin: ghi rõ, không tự điền số liệu. */
export function Missing() {
  return <span className="faint">{t('Chưa có dữ liệu')}</span>;
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-row">
      <span className="tiny muted">{t(label)}</span>
      <div className="small">{value === null || value === undefined || value === '' ? <Missing /> : value}</div>
    </div>
  );
}

/** Cảnh báo chung cho mọi nội dung sức khoẻ. Không chẩn đoán, không thay thế chuyên gia. */
export function HealthDisclaimer({ pending }: { pending?: boolean }) {
  return (
    <div className="disclaimer small" role="note">
      <Icon name="shield" size={16} />
      <div>
        {pending && <p><b>{t('Nội dung đang chờ quản lý phòng tập duyệt.')}</b> {t('Hãy hỏi huấn luyện viên trước khi áp dụng.')}</p>}
        <p>{t('Thông tin chỉ mang tính tham khảo chung, chưa được chuyên gia y tế xác minh, không dùng để chẩn đoán hay điều trị. Dừng tập nếu thấy đau hoặc không khoẻ và hỏi ý kiến nhân viên y tế khi có bệnh lý.')}</p>
        <ViOnlyNote />
      </div>
    </div>
  );
}

/**
 * Danh sách nguồn kèm giấy phép. Với nội dung biên soạn lại (ADAPTED) không ghi "theo NHS/WHO":
 * chỉ hiện câu ghi công bắt buộc của giấy phép và nói rõ đơn vị phát hành không bảo trợ.
 */
export function SourceList({ sources, origin }: { sources: Source[]; origin: ContentOrigin }) {
  if (sources.length === 0) return <p className="small"><Missing /> – {t('nội dung chưa gắn nguồn tham khảo.')}</p>;
  const ogl = sources.filter((s) => s.attribution);
  return (
    <div className="stack-sm">
      <p className="tiny muted">
        {t(origin === 'ADAPTED'
          ? 'Nội dung tiếng Việt do GymFlow tự biên soạn lại, không phải bản gốc hay bản dịch chính thức. Các đơn vị phát hành dưới đây không xác nhận hay bảo trợ GymFlow.'
          : 'Nội dung do GymFlow tự biên soạn; các nguồn dưới đây dùng để tham khảo khuyến nghị chung.')}
      </p>
      <ul className="source-list">
        {sources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer noopener" lang="en"><b>{s.title}</b> <Icon name="arrowRight" size={12} style={{ display: 'inline', verticalAlign: -1 }} /></a>
            <div className="tiny muted">
              {s.publisher}
              {s.publisherReviewed && <> · {t('Trang ghi rà soát {d}', { d: fmtDate(s.publisherReviewed) })}</>}
              {' · '}{t('Truy cập {d}', { d: fmtDate(s.accessedAt) })}
            </div>
            <div className="tiny row row-wrap" style={{ gap: 6, marginTop: 4 }}>
              {s.license
                ? (s.licenseUrl ? <a className="muted" href={s.licenseUrl} target="_blank" rel="noreferrer noopener">{t(s.license)}</a> : <span className="muted">{t(s.license)}</span>)
                : <Missing />}
              {!s.licenseVerified && <Badge tone="amber">Giấy phép chưa xác minh</Badge>}
            </div>
          </li>
        ))}
      </ul>
      {ogl.length > 0 && <p className="tiny faint" lang="en">{ogl[0].attribution}</p>}
    </div>
  );
}

/** Hiển thị thân bài: "## " là tiêu đề, "- " là gạch đầu dòng, dòng trống tách đoạn. Không render HTML thô. */
export function Prose({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <div className="prose" lang="vi">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        const out: ReactNode[] = [];
        let list: string[] = [];
        const flush = () => { if (list.length) { out.push(<ul key={`u${out.length}`}>{list.map((l, j) => <li key={j}>{l}</li>)}</ul>); list = []; } };
        lines.forEach((l) => {
          if (l.startsWith('## ')) { flush(); out.push(<h2 key={`h${out.length}`}>{l.slice(3)}</h2>); }
          else if (l.startsWith('- ')) list.push(l.slice(2));
          else { flush(); out.push(<p key={`p${out.length}`}>{l}</p>); }
        });
        flush();
        return <div key={i}>{out}</div>;
      })}
    </div>
  );
}
