import { useCallback, useEffect, useRef, useState } from 'react';
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
