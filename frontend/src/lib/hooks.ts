import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { t } from '../i18n';

/** Tải dữ liệu theo deps; trả về data, lỗi, trạng thái và hàm reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await run();
      if (id === seq.current) setData(res);
    } catch (e) {
      if (id === seq.current) setError(t(e instanceof ApiError ? e.message : 'Có lỗi xảy ra'));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Thông báo từ backend là tiếng Việt; bản tiếng Anh tra trong từ điển, thiếu thì giữ nguyên. */
export const errMsg = (e: unknown) => t(e instanceof ApiError ? e.message : 'Có lỗi xảy ra');
export const fieldErrs = (e: unknown): Record<string, string> =>
  (e instanceof ApiError ? Object.fromEntries(Object.entries(e.fieldErrors).map(([k, v]) => [k, t(v)])) : {});

/**
 * Phân trang phía client cho các API trả về cả danh sách (bài tập, đăng ký gói, giáo án, bài viết).
 * Đổi bộ lọc (resetKey) thì về trang đầu; danh sách ngắn lại (vừa xoá/lọc) thì kẹp về trang cuối còn dữ liệu.
 * Số dòng mỗi trang được nhớ theo storageKey để quay lại trang vẫn giữ lựa chọn.
 */
export function usePaged<T>(list: T[], storageKey: string, resetKey: unknown, defaultSize = 20) {
  const [page, setPage] = useState(0);
  const [size, setSizeState] = useState(() => {
    const saved = Number(localStorage.getItem(`gf.pageSize.${storageKey}`));
    return PAGE_SIZES.includes(saved) ? saved : defaultSize;
  });
  useEffect(() => { setPage(0); }, [resetKey]);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(page, totalPages - 1);
  const items = useMemo(() => list.slice(current * size, current * size + size), [list, current, size]);
  const setSize = (s: number) => { setSizeState(s); setPage(0); localStorage.setItem(`gf.pageSize.${storageKey}`, String(s)); };
  return { items, page: current, size, totalPages, total: list.length, setPage, setSize };
}
export const PAGE_SIZES = [10, 12, 20, 24, 50, 100];
