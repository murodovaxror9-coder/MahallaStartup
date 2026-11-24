import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminActions, isOverdue, statusLabel, timeLeft } from './rules.ts';

test('OPEN joriy davrda "Ovoz berilmoqda" deb ko‘rinadi', () => {
  assert.equal(statusLabel('OPEN', true), 'Ovoz berilmoqda');
  assert.equal(statusLabel('OPEN', false), 'Ochiq');
  assert.equal(statusLabel('REFERRED'), 'Tashkilotdan javob kutilmoqda');
});

test('admin amallari holatga bog‘liq', () => {
  assert.deepEqual(adminActions('PENDING_REVIEW', false), ['approve', 'reject', 'merge']);
  assert.deepEqual(adminActions('OPEN', true), []);
  assert.deepEqual(adminActions('OPEN', false), ['carryOver']);
  assert.ok(!adminActions('SELECTED', false).includes('RESOLVED'));
  assert.deepEqual(adminActions('REJECTED', false), []);
});

test('qolgan vaqt', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  assert.equal(timeLeft('2026-11-30T19:00:00Z', now), '6 kun 9 soat');
  assert.equal(timeLeft('2026-11-24T10:30:00Z', now), '30 daqiqa');
  assert.equal(timeLeft('2026-11-24T09:00:00Z', now), 'Yakunlandi');
});

test('muddati o‘tgan ish faqat jarayondagi holatlarda', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  assert.equal(isOverdue('2026-11-20T00:00:00Z', 'IN_PROGRESS', now), true);
  assert.equal(isOverdue('2026-11-20T00:00:00Z', 'RESOLVED', now), false);
  assert.equal(isOverdue(null, 'IN_PROGRESS', now), false);
});

test('sana Toshkent vaqtida dd.mm.yyyy', async () => {
  const { fmtDate, fmtDateTime } = await import('./rules.ts');
  assert.equal(fmtDate('2026-11-30T19:00:00Z'), '01.12.2026');
  assert.equal(fmtDateTime('2026-11-30T19:00:00Z'), '01.12.2026, 00:00');
});
