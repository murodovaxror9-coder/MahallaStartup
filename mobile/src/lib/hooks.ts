import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from './api';
import type { MeData, Page } from './types';

function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi';
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Bitta obyekt qaytaradigan endpoint uchun (masalan, `/home`, `/me`, `/issues/:id`).
 * `fetchData` faqat effekt uchun (ichida sinxron `setState` yo'q); `reload` esa foydalanuvchi
 * amali (tugma, pull-to-refresh) uchun — darhol `loading: true` qo'yadi.
 */
export function useApi<T>(path: string, enabled = true) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: enabled, error: null });

  const fetchData = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return api<T>(path)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e) => setState({ data: null, loading: false, error: errorMessage(e) }));
  }, [path, enabled]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return fetchData();
  }, [fetchData]);

  return { ...state, reload };
}

export function useMe() {
  return useApi<MeData>('/me');
}

/** Kursorli sahifalash (`{ items, nextCursor }`) qaytaradigan ro'yxat endpointlari uchun. */
export function usePagedList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(() => {
    return api<Page<T>>(path)
      .then((p) => {
        setItems(p.items);
        setCursor(p.nextCursor);
        setError(null);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const reload = useCallback(() => {
    setLoading(true);
    return fetchPage();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const sep = path.includes('?') ? '&' : '?';
    api<Page<T>>(`${path}${sep}cursor=${encodeURIComponent(cursor)}`)
      .then((p) => {
        setItems((prev) => [...prev, ...p.items]);
        setCursor(p.nextCursor);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, path]);

  return { items, setItems, loading, loadingMore, error, hasMore: cursor !== null, reload, loadMore };
}
