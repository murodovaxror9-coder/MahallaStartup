'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ApiErrorBody, Page } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

function csrf() {
  return /(?:^|;\s*)md_csrf=([^;]+)/.exec(document.cookie)?.[1] ?? '';
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const method = init.method ?? (init.body || init.form ? 'POST' : 'GET');
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(init.body !== undefined && { 'content-type': 'application/json' }),
        ...(method !== 'GET' && { 'x-csrf-token': csrf() }),
      },
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Tarmoq bilan aloqa yo‘q. Internetni tekshirib, qayta urining.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as ApiErrorBody | null)?.error;
    // Sessiya bekor qilingan (blok/parol tiklash): to'liq qayta yuklash bilan login'ga
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.status === 401 && !path.startsWith('/auth/login')) window.location.href = '/login';
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (e?.code === 'PASSWORD_CHANGE_REQUIRED') window.location.href = '/parol';
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? `Server xatosi (${res.status})`, e?.fields);
  }
  return data as T;
}

/** Yozuvchi amal: pending va xato (maydon xatolari bilan). Xatoda undefined qaytaradi. */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, error, run, reset: () => setError(null) };
}

export const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form)) as Record<string, string>;

/** GET so'rov holati: yuklanmoqda / xato / ma'lumot va qayta yuklash. */
export function useApi<T>(path: string | null) {
  const [tick, setTick] = useState(0);
  const key = `${path}#${tick}`;
  // Qayta yuklashda eski ma'lumot ko'rinib turadi; loading = javob hali shu kalit uchun emas.
  const [st, setSt] = useState<{ key: string; data: T | null; error: ApiError | null }>({ key: '', data: null, error: null });
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data: T) => setSt((s) => ({ ...s, data })), []);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((data) => alive && setSt({ key, data, error: null }))
      .catch((error: ApiError) => alive && setSt((s) => ({ key, data: s.data, error })));
    return () => {
      alive = false;
    };
  }, [path, key]);

  return { data: st.data, error: st.error, loading: st.key !== key, reload, setData };
}

/** Cursor bilan sahifalangan ro'yxat: birinchi sahifa useApi orqali, keyingilari loadMore bilan qo'shiladi. */
export function usePaged<T>(path: string) {
  const q = useApi<Page<T>>(path);
  // extra faqat shu birinchi sahifaga tegishli; filtr yoki reload'da o'z-o'zidan tashlanadi
  const [extra, setExtra] = useState<{ base: Page<T> | null; items: T[]; next: string | null }>({ base: null, items: [], next: null });
  const more = useAction();
  const fresh = q.data !== null && extra.base === q.data;
  const next = fresh ? extra.next : (q.data?.nextCursor ?? null);
  const data = q.data && { items: fresh ? [...q.data.items, ...extra.items] : q.data.items, nextCursor: next };

  async function loadMore() {
    if (!next || !q.data) return;
    const base = q.data;
    const p = await more.run(() => api<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(next)}`));
    if (p) setExtra({ base, items: [...(fresh ? extra.items : []), ...p.items], next: p.nextCursor });
  }

  return { ...q, data, loadMore, loadingMore: more.pending, moreError: more.error };
}
