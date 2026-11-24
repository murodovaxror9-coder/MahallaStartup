import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminActions, fmtDate, fmtDateTime, isOverdue, monthName, timeLeft } from './rules.ts';

test('admin amallari backend holat mashinasiga mos', () => {
  assert.deepEqual(adminActions('PENDING_REVIEW', false), ['approve', 'reject', 'merge']);
  assert.deepEqual(adminActions('OPEN', true), []);
  assert.deepEqual(adminActions('OPEN', false), ['carryOver']);
  assert.deepEqual(adminActions('SELECTED', false), ['IN_PROGRESS']); // SELECTED -> REFERRED yo'q
  assert.ok(!adminActions('REFERRED', false).includes('REFERRED'));
  assert.deepEqual(adminActions('MERGED', false), []);
  assert.deepEqual(adminActions('REJECTED', false), []);
});

test('qolgan vaqt', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  assert.equal(timeLeft('2026-11-30T19:00:00Z', now), '6 kun 9 soat');
  assert.equal(timeLeft('2026-11-24T10:30:00Z', now), '30 daqiqa');
  assert.equal(timeLeft('2026-11-24T09:00:00Z', now), 'Yakunlandi');
});

test('muddat Toshkent kuni bo‘yicha, faqat jarayondagi holatlarda', () => {
  const now = new Date('2026-11-24T20:00:00Z'); // Toshkentda allaqachon 25-noyabr
  assert.equal(isOverdue('2026-11-24', 'IN_PROGRESS', now), true);
  assert.equal(isOverdue('2026-11-25', 'IN_PROGRESS', now), false);
  assert.equal(isOverdue('2026-11-01', 'RESOLVED', now), false);
  assert.equal(isOverdue(null, 'IN_PROGRESS', now), false);
});

test('sana va davr nomi Toshkent vaqtida', () => {
  assert.equal(fmtDate('2026-11-30T19:00:00Z'), '01.12.2026');
  assert.equal(fmtDateTime('2026-11-30T19:00:00Z'), '01.12.2026, 00:00');
  assert.equal(monthName('2026-10-31T19:00:00.000Z'), 'Noyabr 2026');
});
