import { describe, expect, it } from 'vitest';
import { AppError } from '../../common/app-error';
import { ISSUE_STATUSES, type IssueStatus } from '../../core/types';
import { allowedTargets, checkTransition, RULES, type Actor, type TransitionInput } from './status-machine';

const FULL: TransitionInput = {
  reason: 'sabab',
  targetIssueId: '0197c0de-0000-7000-8000-000000000001',
  responsible: 'Ali',
  nextStep: 'Tekshirish',
  dueDate: '2026-12-10',
  referredOrg: 'Hokimlik',
  referredAt: '2026-12-01',
  followUpAt: '2026-12-15',
  resolutionText: 'Hal qilindi',
};

const ACTORS: Actor[] = ['ADMIN', 'AUTHOR', 'SYSTEM'];

function attempt(from: IssueStatus, to: IssueStatus, actor: Actor, input: TransitionInput = FULL) {
  try {
    checkTransition({ from, to, actor, input });
    return 'ok';
  } catch (e) {
    return e instanceof AppError ? e.code : 'other';
  }
}

describe('muammo holatlari mashinasi', () => {
  it("jadvaldagi har bir o'tish (to'liq maydonlar bilan, to'g'ri aktor) ishlaydi", () => {
    for (const r of RULES) {
      for (const actor of r.by) expect(attempt(r.from, r.to, actor)).toBe('ok');
    }
  });

  it("qolgan barcha o'tishlar 409 INVALID_STATUS_TRANSITION", () => {
    for (const from of ISSUE_STATUSES) {
      for (const to of ISSUE_STATUSES) {
        for (const actor of ACTORS) {
          const rule = RULES.find((r) => r.from === from && r.to === to);
          if (rule?.by.includes(actor)) continue;
          expect(attempt(from, to, actor), `${from} -> ${to} (${actor})`).toBe('INVALID_STATUS_TRANSITION');
        }
      }
    }
  });

  it("OPEN -> SELECTED faqat tizim (davr yopish) uchun; admin qila olmaydi", () => {
    expect(attempt('OPEN', 'SELECTED', 'SYSTEM')).toBe('ok');
    expect(attempt('OPEN', 'SELECTED', 'ADMIN')).toBe('INVALID_STATUS_TRANSITION');
  });

  it("IN_PROGRESS majburiy maydonlarsiz 400 VALIDATION_ERROR (mas'ul, qadam, muddat)", () => {
    expect(attempt('SELECTED', 'IN_PROGRESS', 'ADMIN', {})).toBe('VALIDATION_ERROR');
    try {
      checkTransition({ from: 'SELECTED', to: 'IN_PROGRESS', actor: 'ADMIN', input: { responsible: 'Ali' } });
    } catch (e) {
      expect(Object.keys((e as AppError).details['fields'] as object).sort()).toEqual(['dueDate', 'nextStep']);
    }
  });

  it('REFERRED -> IN_PROGRESS: mavjud mas\'ul/qadam/muddat qayta so\'ralmaydi', () => {
    expect(
      (() => {
        try {
          checkTransition({
            from: 'REFERRED',
            to: 'IN_PROGRESS',
            actor: 'ADMIN',
            input: {},
            current: { responsible: 'Ali', nextStep: 'Qadam', dueDate: '2026-12-10' },
          });
          return 'ok';
        } catch {
          return 'fail';
        }
      })(),
    ).toBe('ok');
  });

  it('REFERRED va RESOLVED o\'z majburiy maydonlarini talab qiladi', () => {
    expect(attempt('IN_PROGRESS', 'REFERRED', 'ADMIN', { referredOrg: 'X' })).toBe('VALIDATION_ERROR');
    expect(attempt('IN_PROGRESS', 'RESOLVED', 'ADMIN', {})).toBe('VALIDATION_ERROR');
    expect(attempt('RESOLVED', 'IN_PROGRESS', 'ADMIN', { responsible: 'A', nextStep: 'B', dueDate: '2026-12-01' })).toBe(
      'VALIDATION_ERROR', // sabab majburiy
    );
  });

  it('allowedTargets', () => {
    expect(allowedTargets('PENDING_REVIEW').sort()).toEqual(['MERGED', 'OPEN', 'REJECTED']);
    expect(allowedTargets('MERGED')).toEqual([]);
  });
});
