import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, assertConfig } from '../src/config.js';

test('empty strings from unset GitHub secrets fall back to defaults', () => {
  const cfg = loadConfig({ POST_FOOTER: '', MIN_INTERVAL_HOURS: '', MAX_INTERVAL_HOURS: '', BLURT_RPC_URLS: '' });
  assert.equal(cfg.footerOverride, null);
  assert.deepEqual(cfg.categories, ['health', 'crypto', 'lifestyle', 'technology']);
  assert.equal(cfg.schedule.minHours, 7);
  assert.equal(cfg.schedule.maxHours, 9);
  assert.ok(cfg.blurt.rpcUrls.length > 0);
});

test('POST_FOOTER=none removes the footer; custom text replaces it', () => {
  assert.equal(loadConfig({ POST_FOOTER: 'none' }).footerOverride, '');
  assert.equal(loadConfig({ POST_FOOTER: 'Stay well!' }).footerOverride, 'Stay well!');
});

test('username tolerates a leading @', () => {
  assert.equal(loadConfig({ BLURT_USERNAME: '@alice ' }).blurt.username, 'alice');
});

test('assertConfig lists every missing setting', () => {
  assert.throws(() => assertConfig(loadConfig({}), { needBlurt: true }), /GEMINI_API_KEY.*BLURT_USERNAME.*BLURT_POSTING_KEY/);
  assert.doesNotThrow(() => assertConfig(loadConfig({ GEMINI_API_KEY: 'x' }), { needBlurt: false }));
});

test('POST_CATEGORIES picks a subset and rejects typos', () => {
  assert.deepEqual(loadConfig({ POST_CATEGORIES: 'Crypto, health' }).categories, ['crypto', 'health']);
  assert.throws(() => loadConfig({ POST_CATEGORIES: 'health,sportz' }), /Unknown category "sportz"/);
});
