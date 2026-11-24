'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Page } from './types';

/** Server xato javobi (docs/FOR_CLIENTS.md). */
interface ErrorResponse {
  error: { code: string; message: string; details?: { fields?: Record<string, string> } & Record<string, unknown> };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

function csrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('mhd_csrf='))
    ?.split('=')[1];
}

type Init = { method?: string; json?: unknown; form?: FormData; headers?: Record<string, string> };

/**
 * `/api/v1/*` ga so'rov. Next `rewrites` uni backendga proksi qiladi (bitta origin).
 * Cookie sessiya + o'zgartiruvchi so'rovlarda `X-CSRF-Token` (double-submit).
 */
export async function api<T = void>(path: string, init: Init = {}): Promise<T> {
  const method = (init.method ?? (init.json !== undefined || init.form ? 'POST' : 'GET')).toUpperCase();
  const h = new Headers(init.headers);
  if (init.json !== undefined) h.set('Content-Type', 'application/json');
  if (method !== 'GET') {
    const token = csrfToken();
    if (token) h.set('X-CSRF-Token', token);
  }

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers: h,
      credentials: 'include',
      body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Server bilan aloqa yo‘q. Internetni tekshirib, qayta urining.');
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ErrorResponse | null)?.error;
    // Sessiya bekor qilingan (blok, parol tiklash): to'liq qayta yuklash bilan login'ga
    if (res.status === 401 && !path.startsWith('/auth/login')) window.location.href = '/login';
    if (err?.code === 'PASSWORD_CHANGE_REQUIRED') window.location.href = '/change-password';
    throw new ApiError(res.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? `Server xatosi (${res.status})`, err?.details?.fields ?? {});
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

/** Bo'sh satrlarni tashlab yuboradi: backend ixtiyoriy maydonda bo'sh satrni xato deb biladi. */
export const compact = (v: Record<string, string>) => Object.fromEntries(Object.entries(v).filter(([, x]) => x.trim() !== ''));

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
