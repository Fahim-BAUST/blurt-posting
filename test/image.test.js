import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateExtraImages } from '../src/image.js';

test('generateExtraImages keeps the images that worked and skips the ones that failed', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) =>
    decodeURIComponent(url).includes('broken')
      ? new Response('down', { status: 503 })
      : new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { 'content-type': 'image/jpeg' } }),
  );
  const logs = [];
  const cfg = { cloudflare: {} };
  const plans = [{ prompt: 'a park', alt: 'Park' }, { prompt: 'broken scene', alt: 'Broken' }];
  const out = await generateExtraImages(cfg, plans, { log: (m) => logs.push(m) });
  assert.equal(out.length, 1);
  assert.equal(out[0].alt, 'Park');
  assert.equal(out[0].provider, 'pollinations');
  assert.ok(logs.some((m) => /Extra image 2 skipped/.test(m)));
});
