import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelJson, validateDraft, composeBody, firstSentence } from '../src/compose.js';

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

const goodDraft = () => ({
  title: 'Five small habits that protect your sleep',
  body: `## Why it matters\n\n${words(1000)}`,
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

test('validateDraft flags crypto hype and price predictions', () => {
  for (const bad of ['This coin offers guaranteed returns.', 'Get ready to go to the moon!', 'It could be a 100x play.', 'Bitcoin will reach $500,000 soon.']) {
    const d = goodDraft();
    d.body += `\n\n${bad}`;
    assert.ok(validateDraft(d).length > 0, bad);
  }
});

test('validateDraft allows honest risk wording and everyday prices', () => {
  const d = goodDraft();
  d.body += '\n\nNothing here is guaranteed, and prices can fall. A cheap $5 notebook works fine for records.';
  assert.deepEqual(validateDraft(d), []);
});

test('validateDraft allows warnings about hype (scam-awareness posts)', () => {
  for (const ok of [
    'Scammers often promise guaranteed returns to lure you in.',
    'There are no guaranteed returns in crypto.',
    'Be wary of anyone who talks about a 100x coin.',
  ]) {
    const d = goodDraft();
    d.body += `\n\n${ok}`;
    assert.deepEqual(validateDraft(d), [], ok);
  }
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

test('validateDraft rejects AI-cliché words in title or body', () => {
  for (const [field, text] of [
    ['title', 'Blockchain Unlocked: What Beginners Should Know'],
    ['title', 'DeFi Decoded for Beginners'],
    ['title', 'Demystifying the Cloud'],
    ['body', 'Here is how to navigate the settings menu.'],
    ['body', 'Let us delve into the details.'],
    ['body', 'It works seamlessly across devices.'],
  ]) {
    const d = goodDraft();
    d[field] = field === 'body' ? `${d.body}\n\n${text}` : text;
    assert.ok(validateDraft(d).some((p) => /cliché/.test(p)), text);
  }
});

test('validateDraft rejects formulaic openings', () => {
  for (const opening of ['Have you ever wondered why you feel tired?', 'Imagine waking up rested.', 'It is 7:15 AM and the alarm rings.', "You know that feeling when your back aches?"]) {
    const d = goodDraft();
    d.body = `${opening}\n\n${d.body}`;
    assert.ok(validateDraft(d).some((p) => /opening/.test(p)), opening);
  }
});

test('firstSentence skips images and headings', () => {
  assert.equal(firstSentence('![x](y.jpg)\n\n## Intro\n\nSleep matters. A lot.'), 'Sleep matters.');
});

test('composeBody adds related posts before the footer', () => {
  const body = composeBody(goodDraft(), {
    imageUrl: 'https://img.example/x.jpg',
    footer: 'FOOTER',
    related: [{ title: 'Older [post]', url: 'https://blurt.blog/health/@a/older' }],
  });
  const relatedAt = body.indexOf('## You might also like');
  assert.ok(relatedAt > 0 && relatedAt < body.indexOf('FOOTER'));
  assert.ok(body.includes('- [Older post](https://blurt.blog/health/@a/older)'));
});

test('composeBody leaves out the related section when there is nothing to link', () => {
  assert.ok(!composeBody(goodDraft(), { imageUrl: 'u', footer: '', related: [] }).includes('You might also like'));
});

test('validateDraft allows "navigation" as a plain noun', () => {
  const d = goodDraft();
  d.body += '\n\nMost EVs show charging stops in the navigation screen.';
  assert.deepEqual(validateDraft(d), []);
});
