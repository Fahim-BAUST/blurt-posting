import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDue, pickNextPostAt, recentlyPostedOnChain } from '../src/schedule.js';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-09-24T10:00:00Z');

test('isDue is true when no post has been scheduled yet', () => {
  assert.equal(isDue({ nextPostAt: null }, now), true);
});

test('isDue compares against nextPostAt', () => {
  assert.equal(isDue({ nextPostAt: '2026-09-24T09:59:00Z' }, now), true);
  assert.equal(isDue({ nextPostAt: '2026-09-24T10:00:00Z' }, now), true);
  assert.equal(isDue({ nextPostAt: '2026-09-24T10:01:00Z' }, now), false);
});

test('pickNextPostAt stays inside the min/max window', () => {
  for (const r of [0, 0.25, 0.5, 0.999999]) {
    const next = pickNextPostAt(now, { minHours: 7, maxHours: 9, random: () => r });
    const gap = next.getTime() - now.getTime();
    assert.ok(gap >= 7 * HOUR && gap <= 9 * HOUR, `gap ${gap / HOUR}h out of range for r=${r}`);
  }
});

test('pickNextPostAt spreads across the window (not a fixed interval)', () => {
  const gaps = new Set();
  for (let i = 0; i < 50; i++) {
    const next = pickNextPostAt(now, { minHours: 7, maxHours: 9 });
    gaps.add(Math.round((next.getTime() - now.getTime()) / 60000));
  }
  assert.ok(gaps.size > 10, 'expected varied intervals');
});

test('pickNextPostAt rejects an inverted window', () => {
  assert.throws(() => pickNextPostAt(now, { minHours: 9, maxHours: 7 }));
});

test('recentlyPostedOnChain guards against double posting', () => {
  // Blurt returns UTC timestamps without a trailing Z.
  assert.equal(recentlyPostedOnChain('2026-09-24T06:00:00', now, 6), true);
  assert.equal(recentlyPostedOnChain('2026-09-24T03:00:00', now, 6), false);
  assert.equal(recentlyPostedOnChain('1970-01-01T00:00:00', now, 6), false);
  assert.equal(recentlyPostedOnChain(undefined, now, 6), false);
});
