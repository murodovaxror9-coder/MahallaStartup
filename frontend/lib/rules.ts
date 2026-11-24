// UI matnlari va holat qoidalari. Manba — backend/src/modules/issues/status-machine.ts;
// bu yerdagi ro'yxat faqat noto'g'ri tugmani ko'rsatmaslik uchun, tekshiruvni baribir backend qiladi.
import type { Category, IssueStatus } from './types';

export const STATUS_LABEL: Record<IssueStatus, string> = {
  PENDING_REVIEW: 'Moderatsiyada',
  REJECTED: 'Tuzatish kerak',
  MERGED: 'Birlashtirilgan',
  OPEN: 'Ovoz berilmoqda',
  SELECTED: 'Oylik ovozda tanlandi',
  IN_PROGRESS: 'Jarayonda',
  REFERRED: 'Tashkilotdan javob kutilmoqda',
  RESOLVED: 'Hal qilindi',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  ROAD: 'Yo‘l',
  LIGHTING: 'Yoritish',
  WASTE: 'Chiqindi',
  WATER: 'Suv',
  LANDSCAPING: 'Obodonlashtirish',
  OTHER: 'Boshqa',
};

export type AdminAction = 'approve' | 'reject' | 'merge' | 'carryOver' | 'work' | 'IN_PROGRESS' | 'REFERRED' | 'RESOLVED';

/** carryOver faqat OPEN post joriy davrda bo'lmasa (backend: oldingi davrda qatnashgan bo'lishi ham shart). */
export function adminActions(status: IssueStatus, inCurrentRound: boolean): AdminAction[] {
  switch (status) {
    case 'PENDING_REVIEW':
      return ['approve', 'reject', 'merge'];
    case 'OPEN':
      return inCurrentRound ? [] : ['carryOver'];
    case 'SELECTED':
      return ['IN_PROGRESS'];
    case 'IN_PROGRESS':
      return ['work', 'REFERRED', 'RESOLVED'];
    case 'REFERRED':
      return ['IN_PROGRESS', 'RESOLVED'];
    case 'RESOLVED':
      return ['IN_PROGRESS']; // muallif e'tirozidan keyin qayta ochish, sabab majburiy
    default:
      return [];
  }
}

// ru-RU faqat raqamli format uchun: 01.12.2026, 13:43 (uz-Latn ISO ko'rinishini beradi)
const TZ = 'Asia/Tashkent';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

/** Davr nomi: periodStart Toshkent vaqtida oyning 1-kuni 00:00. */
export function monthName(periodStart: string): string {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(new Date(periodStart)).split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** "3 kun 4 soat" kabi qolgan vaqt. Muddat o'tgan bo'lsa "Yakunlandi". */
export function timeLeft(endIso: string, now: Date = new Date()): string {
  const ms = new Date(endIso).getTime() - now.getTime();
  if (ms <= 0) return 'Yakunlandi';
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} kun ${h % 24} soat`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} soat ${m} daqiqa` : `${m} daqiqa`;
}

/** Toshkent bo'yicha bugungi sana YYYY-MM-DD. */
export const todayTashkent = (now: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

/** dueDate YYYY-MM-DD: muddat kuni o'tib ketgan bo'lsa (bugun hali muddat ichida). */
export function isOverdue(dueDate: string | null, status: IssueStatus, now: Date = new Date()): boolean {
  return !!dueDate && (status === 'IN_PROGRESS' || status === 'REFERRED') && dueDate.slice(0, 10) < todayTashkent(now);
}
