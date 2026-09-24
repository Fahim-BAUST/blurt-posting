import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategory } from '../src/categories.js';
import { allTopics, pickTopic, parseTopicKey } from '../src/topics.js';

const ALL = CATEGORIES.map((c) => c.id);

test('topic bank covers every audience/theme pair in every category', () => {
  const expected = CATEGORIES.reduce((n, c) => n + c.audiences.length * c.themes.length, 0);
  assert.equal(allTopics(ALL).length, expected);
});

test('every category has the fields the prompt and footer rely on', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.tag && c.label && c.footer && c.exampleTags, c.id);
    assert.ok(c.audiences.length && c.themes.length && c.formats.length && c.rules.length, c.id);
  }
});

test('getCategory rejects unknown ids', () => {
  assert.throws(() => getCategory('sports'), /Unknown category/);
});

test('parseTopicKey reads new keys and legacy health keys', () => {
  assert.deepEqual(parseTopicKey('crypto:beginners:scams'), { category: 'crypto', audience: 'beginners', theme: 'scams' });
  assert.deepEqual(parseTopicKey('midlife:hydration'), { category: 'health', audience: 'midlife', theme: 'hydration' });
});

test('pickTopic never posts the same category twice in a row', () => {
  for (const last of ALL) {
    for (let i = 0; i < 20; i++) {
      const t = pickTopic([{ topicKey: allTopics([last])[0].key }], { categories: ALL });
      assert.notEqual(t.category.id, last);
    }
  }
});

test('pickTopic treats legacy history keys as health', () => {
  for (let i = 0; i < 20; i++) {
    assert.notEqual(pickTopic([{ topicKey: 'midlife:hydration' }], { categories: ALL }).category.id, 'health');
  }
});

test('pickTopic favours the category that has waited longest', () => {
  // health, crypto, lifestyle posted most recently in that order; technology is overdue.
  const history = ['health', 'crypto', 'lifestyle'].map((c) => ({ topicKey: allTopics([c])[0].key }));
  const counts = {};
  for (let i = 0; i < 200; i++) {
    const id = pickTopic(history, { categories: ALL }).category.id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  assert.ok(counts.technology > (counts.health ?? 0), JSON.stringify(counts));
  assert.equal(counts.lifestyle, undefined);
});

test('pickTopic respects the enabled category list', () => {
  for (let i = 0; i < 20; i++) {
    assert.ok(['health', 'crypto'].includes(pickTopic([], { categories: ['health', 'crypto'] }).category.id));
  }
});

test('pickTopic with a single category still works', () => {
  const history = [{ topicKey: allTopics(['health'])[0].key }];
  assert.equal(pickTopic(history, { categories: ['health'] }).category.id, 'health');
});

test('pickTopic never repeats a used topic within its category', () => {
  const topics = allTopics(['crypto']);
  const history = topics.slice(1).map((t) => ({ topicKey: t.key }));
  assert.equal(pickTopic(history, { categories: ['crypto'], random: () => 0 }).key, topics[0].key);
});

test('pickTopic avoids the last audience and theme used in that category', () => {
  const last = allTopics(['health'])[0];
  const history = [{ topicKey: last.key }, { topicKey: allTopics(['crypto'])[0].key }];
  for (let i = 0; i < 30; i++) {
    const t = pickTopic(history, { categories: ['health', 'crypto'] });
    assert.equal(t.category.id, 'health');
    assert.notEqual(t.audience.id, last.audience.id);
    assert.notEqual(t.theme.id, last.theme.id);
  }
});

test('pickTopic still works once every topic in a category has been used', () => {
  const history = allTopics(['lifestyle']).map((t) => ({ topicKey: t.key }));
  const t = pickTopic(history, { categories: ['lifestyle'] });
  assert.ok(t.key);
  assert.ok(t.category.formats.includes(t.format));
});
