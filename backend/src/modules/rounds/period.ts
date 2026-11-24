/** Toshkent UTC+5, DST yo'q: `2026-12` davri = `2026-11-30T19:00:00Z` ... `2026-12-31T19:00:00Z`. */
const TZ_OFFSET_MS = 5 * 3600_000;

export interface Period {
  /** `YYYY-MM` */
  key: string;
  start: Date;
  end: Date;
}

export function periodOf(year: number, month0: number): Period {
  const start = new Date(Date.UTC(year, month0, 1) - TZ_OFFSET_MS);
  const end = new Date(Date.UTC(year, month0 + 1, 1) - TZ_OFFSET_MS);
  const shifted = new Date(Date.UTC(year, month0, 1));
  const key = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
  return { key, start, end };
}

/** `at` qaysi oylik davrga tushadi (Toshkent vaqti bo'yicha). */
export function periodFor(at: Date): Period {
  const shifted = new Date(at.getTime() + TZ_OFFSET_MS);
  return periodOf(shifted.getUTCFullYear(), shifted.getUTCMonth());
}

export function parsePeriodKey(key: string): Period | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return periodOf(Number(m[1]), month - 1);
}
