import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateDraft } from '../src/llm.js';
import { loadConfig } from '../src/config.js';
import { pickTopic } from '../src/topics.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
const draft = (body) => ({ title: 'Drink water', body, tags: ['water'], image_prompt: 'glass of water', image_alt: 'water' });
const geminiReply = (obj) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const groqReply = (obj) => ({ choices: [{ message: { content: JSON.stringify(obj) } }] });

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    const { status = 200, json } = handler(calls.length, String(url));
    return new Response(JSON.stringify(json), { status });
  };
  return calls;
}

const silent = () => {};

test('retries with feedback when the first draft is invalid', async () => {
  const calls = mockFetch((n) => ({ json: geminiReply(draft(n === 1 ? 'too short' : words(400))) }));
  const cfg = loadConfig({ GEMINI_API_KEY: 'test' });

  const { draft: d, provider } = await generateDraft(cfg, pickTopic([]), { log: silent, retryDelayMs: 0 });

  assert.equal(provider, 'gemini (gemini-3.6-flash)');
  assert.equal(d.title, 'Drink water');
  assert.equal(calls.length, 2);
  assert.match(calls[1].body.contents[0].parts[0].text, /previous attempt had these problems[\s\S]*words/);
});

test('falls back to Groq when Gemini keeps failing', async () => {
  const calls = mockFetch((n, url) =>
    url.includes('googleapis') ? { status: 429, json: { error: 'quota' } } : { json: groqReply(draft(words(400))) },
  );
  const cfg = loadConfig({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'only-model', GROQ_API_KEY: 'q' });

  const { provider } = await generateDraft(cfg, pickTopic([]), { log: silent, retryDelayMs: 0 });

  assert.equal(provider, 'groq');
  assert.equal(calls.filter((c) => c.url.includes('googleapis')).length, 2);
});

test('throws a combined error when every provider fails', async () => {
  mockFetch(() => ({ status: 500, json: { error: 'down' } }));
  const cfg = loadConfig({ GEMINI_API_KEY: 'g' });
  await assert.rejects(generateDraft(cfg, pickTopic([]), { log: silent, retryDelayMs: 0 }), /Could not generate a usable post/);
});

test('a retired Gemini model (404) is skipped straight away for the next model', async () => {
  const calls = mockFetch((n, url) =>
    url.includes('old-model') ? { status: 404, json: { error: 'no longer available' } } : { json: geminiReply(draft(words(400))) },
  );
  const cfg = loadConfig({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'old-model,new-model' });

  const { provider } = await generateDraft(cfg, pickTopic([]), { log: silent, retryDelayMs: 0 });

  assert.equal(provider, 'gemini (new-model)');
  assert.equal(calls.filter((c) => c.url.includes('old-model')).length, 1);
});
