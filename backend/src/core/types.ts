export type Role = 'RESIDENT' | 'MAHALLA_ADMIN';
export type ClientKind = 'MOBILE' | 'WEB';

/** Sessiyadan olinadigan kontekst. `mahallaId` hech qachon klientdan olinmaydi — faqat shu yerdan. */
export interface AuthUser {
  userId: string;
  login: string;
  displayName: string;
  mahallaId: string;
  mahallaName: string;
  mahallaSlug: string;
  role: Role;
  sessionId: string;
  client: ClientKind;
  mustChangePassword: boolean;
  /** Sessiya tugash vaqti (ms) */
  expiresAt: number;
}

export type IssueStatus =
  | 'PENDING_REVIEW'
  | 'OPEN'
  | 'REJECTED'
  | 'MERGED'
  | 'SELECTED'
  | 'IN_PROGRESS'
  | 'REFERRED'
  | 'RESOLVED';

export const ISSUE_STATUSES: readonly IssueStatus[] = [
  'PENDING_REVIEW',
  'OPEN',
  'REJECTED',
  'MERGED',
  'SELECTED',
  'IN_PROGRESS',
  'REFERRED',
  'RESOLVED',
];

export const CATEGORIES = ['ROAD', 'LIGHTING', 'WASTE', 'WATER', 'LANDSCAPING', 'OTHER'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ROAD: "Yo'l",
  LIGHTING: 'Yoritish',
  WASTE: 'Chiqindi',
  WATER: 'Suv',
  LANDSCAPING: 'Obodonlashtirish',
  OTHER: 'Boshqa',
};
