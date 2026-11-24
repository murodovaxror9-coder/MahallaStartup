import { AppError } from '../../common/app-error';
import type { IssueStatus } from '../../core/types';

/**
 * Muammo holatlari mashinasi — BITTA joyda. Hamma o'tish shu jadvaldan o'tadi.
 *
 *   PENDING_REVIEW -> OPEN | REJECTED | MERGED        (admin)
 *   REJECTED       -> PENDING_REVIEW                  (muallif: tahrirlab qayta yuboradi)
 *   OPEN           -> SELECTED                        (faqat davr yopish vazifasi)
 *   SELECTED       -> IN_PROGRESS                     (admin; mas'ul, qadam, muddat majburiy)
 *   IN_PROGRESS    -> REFERRED                        (admin; tashkilot, sana, keyingi tekshiruv majburiy)
 *   REFERRED       -> IN_PROGRESS
 *   IN_PROGRESS | REFERRED -> RESOLVED                (admin; yakun matni majburiy)
 *   RESOLVED       -> IN_PROGRESS                     (admin; sabab majburiy)
 */
export type Actor = 'ADMIN' | 'AUTHOR' | 'SYSTEM';

export interface TransitionInput {
  reason?: string | undefined;
  targetIssueId?: string | undefined;
  responsible?: string | undefined;
  nextStep?: string | undefined;
  dueDate?: string | undefined;
  referredOrg?: string | undefined;
  referredAt?: string | undefined;
  followUpAt?: string | undefined;
  resolutionText?: string | undefined;
}

export type TransitionField = keyof TransitionInput;

/** Issue'da allaqachon bor qiymatlar (masalan, REFERRED -> IN_PROGRESS da mas'ul qayta so'ralmasin). */
export interface CurrentWork {
  responsible: string | null;
  nextStep: string | null;
  dueDate: string | null;
}

interface Rule {
  from: IssueStatus;
  to: IssueStatus;
  by: readonly Actor[];
  required: readonly TransitionField[];
  /** Majburiy maydon issue'dagi mavjud qiymat bilan ham qoplanadi */
  fallbackToCurrent?: boolean;
}

const WORK_FIELDS = ['responsible', 'nextStep', 'dueDate'] as const;

export const RULES: readonly Rule[] = [
  { from: 'PENDING_REVIEW', to: 'OPEN', by: ['ADMIN'], required: [] },
  { from: 'PENDING_REVIEW', to: 'REJECTED', by: ['ADMIN'], required: ['reason'] },
  { from: 'PENDING_REVIEW', to: 'MERGED', by: ['ADMIN'], required: ['targetIssueId'] },
  { from: 'REJECTED', to: 'PENDING_REVIEW', by: ['AUTHOR'], required: [] },
  { from: 'OPEN', to: 'SELECTED', by: ['SYSTEM'], required: [] },
  { from: 'SELECTED', to: 'IN_PROGRESS', by: ['ADMIN'], required: WORK_FIELDS, fallbackToCurrent: true },
  { from: 'IN_PROGRESS', to: 'REFERRED', by: ['ADMIN'], required: ['referredOrg', 'referredAt', 'followUpAt'] },
  { from: 'REFERRED', to: 'IN_PROGRESS', by: ['ADMIN'], required: WORK_FIELDS, fallbackToCurrent: true },
  { from: 'IN_PROGRESS', to: 'RESOLVED', by: ['ADMIN'], required: ['resolutionText'] },
  { from: 'REFERRED', to: 'RESOLVED', by: ['ADMIN'], required: ['resolutionText'] },
  { from: 'RESOLVED', to: 'IN_PROGRESS', by: ['ADMIN'], required: ['reason', ...WORK_FIELDS], fallbackToCurrent: true },
];

export const findRule = (from: IssueStatus, to: IssueStatus): Rule | undefined =>
  RULES.find((r) => r.from === from && r.to === to);

export const allowedTargets = (from: IssueStatus): IssueStatus[] =>
  RULES.filter((r) => r.from === from).map((r) => r.to);

const filled = (v: string | null | undefined): boolean => v !== null && v !== undefined && v.trim() !== '';

/**
 * O'tish ruxsat etilganini va majburiy maydonlar to'liqligini tekshiradi.
 *  - ruxsat yo'q            -> 409 INVALID_STATUS_TRANSITION
 *  - maydon yetishmaydi     -> 400 VALIDATION_ERROR (details.fields)
 */
export function checkTransition(args: {
  from: IssueStatus;
  to: IssueStatus;
  actor: Actor;
  input: TransitionInput;
  current?: CurrentWork;
}): void {
  const rule = findRule(args.from, args.to);
  if (!rule || !rule.by.includes(args.actor)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `«${args.from}» holatidan «${args.to}» holatiga o'tib bo'lmaydi`,
      { from: args.from, to: args.to },
    );
  }

  const missing = rule.required.filter((field) => {
    if (filled(args.input[field])) return false;
    if (rule.fallbackToCurrent && (WORK_FIELDS as readonly string[]).includes(field)) {
      return !filled(args.current?.[field as keyof CurrentWork]);
    }
    return true;
  });
  if (missing.length > 0) {
    throw new AppError('VALIDATION_ERROR', undefined, {
      fields: Object.fromEntries(missing.map((f) => [f, 'Bu holat uchun majburiy maydon'])),
    });
  }
}
