import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIENCES, THEMES, FORMATS, allTopics, pickTopic } from '../src/topics.js';

test('topic bank covers every audience/theme pair', () => {
  assert.equal(allTopics().length, AUDIENCES.length * THEMES.length);
});

test('pickTopic never repeats a recently used topic key', () => {
  const history = allTopics().slice(1).map((t) => ({ topicKey: t.key }));
  const picked = pickTopic(history, { random: () => 0 });
  assert.equal(picked.key, allTopics()[0].key);
});

test('pickTopic avoids the last audience and theme when it can', () => {
  const last = allTopics()[0];
  for (let i = 0; i < 30; i++) {
    const t = pickTopic([{ topicKey: last.key }]);
    assert.notEqual(t.audience.id, last.audience.id);
    assert.notEqual(t.theme.id, last.theme.id);
  }
});

test('pickTopic still works once every topic has been used', () => {
  const history = allTopics().map((t) => ({ topicKey: t.key }));
  const t = pickTopic(history);
  assert.ok(t.key);
  assert.ok(FORMATS.includes(t.format));
});
