import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelJson, validateDraft, composeBody, finalTags } from '../src/compose.js';

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

const goodDraft = () => ({
  title: 'Five small habits that protect your sleep',
  body: `## Why it matters\n\n${words(400)}`,
  tags: ['sleep', 'wellness', 'lifestyle'],
  image_prompt: 'A calm bedroom at dusk with soft warm light, photo',
  image_alt: 'A calm bedroom at dusk',
});

test('parseModelJson handles plain and fenced JSON', () => {
  assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseModelJson('Sure! {"a":1} hope this helps'), { a: 1 });
  assert.throws(() => parseModelJson('no json here'));
});

test('validateDraft accepts a good draft', () => {
  assert.deepEqual(validateDraft(goodDraft()), []);
});

test('validateDraft flags short bodies, long titles and missing fields', () => {
  const d = goodDraft();
  d.body = words(50);
  d.title = 'x'.repeat(200);
  delete d.image_prompt;
  const problems = validateDraft(d);
  assert.equal(problems.length, 3);
});

test('validateDraft flags medication dosage advice', () => {
  const d = goodDraft();
  d.body += '\n\nTake 500 mg of paracetamol twice a day.';
  assert.ok(validateDraft(d).some((p) => /dosage/i.test(p)));
});

test('validateDraft allows everyday quantities like water in ml', () => {
  const d = goodDraft();
  d.body += '\n\nKeep a 500 ml bottle on your desk and refill it twice.';
  assert.deepEqual(validateDraft(d), []);
});

test('validateDraft flags a leading H1 that duplicates the title', () => {
  const d = goodDraft();
  d.body = `# ${d.title}\n\n${d.body}`;
  assert.ok(validateDraft(d).some((p) => /heading/i.test(p)));
});

test('composeBody puts the image first and the footer last', () => {
  const body = composeBody(goodDraft(), { imageUrl: 'https://img.example/x.jpg', footer: 'FOOTER' });
  assert.ok(body.startsWith('![A calm bedroom at dusk](https://img.example/x.jpg)'));
  assert.ok(body.trimEnd().endsWith('FOOTER'));
});

test('composeBody omits the footer when it is empty', () => {
  const body = composeBody(goodDraft(), { imageUrl: 'https://img.example/x.jpg', footer: '' });
  assert.ok(!body.includes('---'));
});

test('finalTags always leads with the category and caps at 5', () => {
  const tags = finalTags(['Sleep', 'health', 'Wellness', 'a b', 'kids', 'more', 'extra'], 'health');
  assert.equal(tags[0], 'health');
  assert.equal(tags.length, 5);
  assert.equal(new Set(tags).size, tags.length);
  assert.ok(tags.every((t) => /^[a-z0-9-]+$/.test(t)));
});
