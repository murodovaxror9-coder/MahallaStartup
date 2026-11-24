// Backend UTC ISO qatorlarni Toshkent vaqti (UTC+5, DST yo'q) sifatida ko'rsatish.

export const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
export const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];
const MONTHS_CAP = MONTHS.map((m) => m[0]!.toUpperCase() + m.slice(1));
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function tashkent(iso: string | Date): Date {
  return new Date(new Date(iso).getTime() + 5 * 3600_000);
}

/** dd.mm.yyyy */
export function formatDate(iso: string): string {
  const d = tashkent(iso);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** dd.mm.yyyy, HH:mm */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatTime(iso: string): string {
  const d = tashkent(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Bugun → 13:43, kecha → «Kecha, 18:10», aks holda dd.mm.yyyy */
export function formatRelative(iso: string): string {
  const d = tashkent(iso);
  const now = tashkent(new Date());
  const day = (x: Date) => Math.floor(x.getTime() / 86_400_000);
  const diff = day(now) - day(d);
  if (diff === 0) return formatTime(iso);
  if (diff === 1) return `Kecha, ${formatTime(iso)}`;
  return formatDate(iso);
}

export function dayNumber(iso: string): string {
  return pad(tashkent(iso).getUTCDate());
}

export function monthShort(iso: string): string {
  return MONTHS_SHORT[tashkent(iso).getUTCMonth()]!;
}

export function monthLong(iso: string): string {
  return MONTHS[tashkent(iso).getUTCMonth()]!;
}

export function monthTitle(iso: string): string {
  return MONTHS_CAP[tashkent(iso).getUTCMonth()]!;
}

/** Oldingi oy nomi (Oktabr g‘olibi). */
export function prevMonthTitle(iso: string): string {
  const m = tashkent(iso).getUTCMonth();
  return MONTHS_CAP[(m + 11) % 12]!;
}

export function weekday(iso: string): string {
  return WEEKDAYS[tashkent(iso).getUTCDay()]!;
}

export function isSameDay(a: string, b: string): boolean {
  return formatDate(a) === formatDate(b);
}

/** «6 kun 10 soat» (docs/design: timeLeft). */
export function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Yopilgan';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days} kun ${hours} soat`;
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours} soat ${minutes} daqiqa`;
  return `${Math.max(minutes, 1)} daqiqa`;
}

export function countdown(iso: string): string {
  const t = timeLeft(iso);
  return t === 'Yopilgan' ? t : `${t} qoldi`;
}

/** YYYY-MM-DD → dd.mm.yyyy */
export function formatYmd(ymd: string | null | undefined): string {
  if (!ymd) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ymd;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Vaqt o'tib ketganmi (render'dan tashqarida hisoblanadigan yordamchi). */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
