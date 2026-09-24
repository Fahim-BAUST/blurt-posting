import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, assertConfig } from '../src/config.js';

test('empty strings from unset GitHub secrets fall back to defaults', () => {
  const cfg = loadConfig({ POST_FOOTER: '', MIN_INTERVAL_HOURS: '', MAX_INTERVAL_HOURS: '', BLURT_RPC_URLS: '' });
  assert.match(cfg.footer, /not medical advice/);
  assert.equal(cfg.schedule.minHours, 7);
  assert.equal(cfg.schedule.maxHours, 9);
  assert.ok(cfg.blurt.rpcUrls.length > 0);
});

test('POST_FOOTER=none removes the footer; custom text replaces it', () => {
  assert.equal(loadConfig({ POST_FOOTER: 'none' }).footer, '');
  assert.equal(loadConfig({ POST_FOOTER: 'Stay well!' }).footer, 'Stay well!');
});

test('username tolerates a leading @', () => {
  assert.equal(loadConfig({ BLURT_USERNAME: '@alice ' }).blurt.username, 'alice');
});

test('assertConfig lists every missing setting', () => {
  assert.throws(() => assertConfig(loadConfig({}), { needBlurt: true }), /GEMINI_API_KEY.*BLURT_USERNAME.*BLURT_POSTING_KEY/);
  assert.doesNotThrow(() => assertConfig(loadConfig({ GEMINI_API_KEY: 'x' }), { needBlurt: false }));
});
