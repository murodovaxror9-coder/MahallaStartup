// UI uchun matnlar va holat qoidalari. Backend baribir har amalni tekshiradi;
// bu yerdagi qoidalar faqat noto'g'ri tugmani ko'rsatmaslik uchun.
import type { Category, IssueStatus } from './types';

export const STATUS_LABEL: Record<IssueStatus, string> = {
  PENDING_REVIEW: 'Moderatsiyada',
  REJECTED: 'Tuzatish kerak',
  OPEN: 'Ochiq',
  SELECTED: 'Oylik ovozda tanlandi',
  IN_PROGRESS: 'Jarayonda',
  REFERRED: 'Tashkilotdan javob kutilmoqda',
  RESOLVED: 'Hal qilindi',
};

export function statusLabel(status: IssueStatus, inCurrentRound = false): string {
  return status === 'OPEN' && inCurrentRound ? 'Ovoz berilmoqda' : STATUS_LABEL[status];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  ROAD: 'Yo‘l',
  LIGHTING: 'Yoritish',
  WASTE: 'Chiqindi',
  WATER: 'Suv',
  LANDSCAPING: 'Obodonlashtirish',
  OTHER: 'Boshqa',
};

export type AdminAction =
  | 'approve'
  | 'reject'
  | 'merge'
  | 'carryOver'
  | 'IN_PROGRESS'
  | 'REFERRED'
  | 'RESOLVED';

export function adminActions(status: IssueStatus, inCurrentRound: boolean): AdminAction[] {
  switch (status) {
    case 'PENDING_REVIEW':
      return ['approve', 'reject', 'merge'];
    case 'OPEN':
      return inCurrentRound ? [] : ['carryOver'];
    case 'SELECTED':
      return ['IN_PROGRESS', 'REFERRED'];
    case 'IN_PROGRESS':
      return ['IN_PROGRESS', 'REFERRED', 'RESOLVED']; // IN_PROGRESS → muddatni sabab bilan yangilash
    case 'REFERRED':
      return ['IN_PROGRESS', 'RESOLVED'];
    case 'RESOLVED':
      return ['IN_PROGRESS']; // muallif e'tirozidan keyin qayta ochish
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

export function isOverdue(dueIso: string | null, status: IssueStatus, now: Date = new Date()): boolean {
  return !!dueIso && (status === 'IN_PROGRESS' || status === 'REFERRED') && new Date(dueIso) < now;
}
