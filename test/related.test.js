import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRelated } from '../src/related.js';

const post = (category, permlink, app = 'blurt-auto-poster/2.0') => ({
  author: 'fanhim', category, permlink, title: `Title ${permlink}`, json_metadata: JSON.stringify({ app }),
});

test('pickRelated prefers the same category, newest first, max 3', () => {
  const recent = [post('health', 'h1'), post('crypto', 'c1'), post('health', 'h2'), post('health', 'h3'), post('health', 'h4')];
  const related = pickRelated(recent, 'health');
  assert.deepEqual(related.map((r) => r.url), [
    'https://blurt.blog/health/@fanhim/h1',
    'https://blurt.blog/health/@fanhim/h2',
    'https://blurt.blog/health/@fanhim/h3',
  ]);
});

test('pickRelated tops up from other categories when the category is new', () => {
  const related = pickRelated([post('crypto', 'c1'), post('lifestyle', 'l1'), post('health', 'h1')], 'technology');
  assert.equal(related.length, 3);
});

test("pickRelated skips posts this bot didn't write", () => {
  const related = pickRelated([post('health', 'old', 'blurt/0.1'), post('health', 'new')], 'health');
  assert.deepEqual(related.map((r) => r.title), ['Title new']);
});
