// Text generation: Google Gemini (free tier) first, Groq (free tier) as fallback.
import { parseModelJson, validateDraft } from './compose.js';
import { buildPrompt } from './prompt.js';

const MAX_RETRY_WAIT_MS = 65_000;

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${new URL(url).host} returned ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    // Rate limits say how long to wait, in a header or in the message ("try again in 12.5s").
    const seconds = Number(res.headers.get('retry-after')) || Number(text.match(/try again in ([\d.]+)s/i)?.[1]);
    if (seconds > 0) err.retryAfterMs = Math.ceil(seconds * 1000);
    throw err;
  }
  return JSON.parse(text);
}

async function gemini({ apiKey, model }, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const json = await postJson(url, { 'x-goog-api-key': apiKey }, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, responseMimeType: 'application/json', maxOutputTokens: 16384 },
  });
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new Error(`Gemini returned no text (finishReason: ${json.candidates?.[0]?.finishReason ?? 'unknown'})`);
  return text;
}

async function groq({ apiKey, model }, prompt) {
  const json = await postJson('https://api.groq.com/openai/v1/chat/completions', { authorization: `Bearer ${apiKey}` }, {
    model,
    temperature: 0.9,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned no text');
  return text;
}

/**
 * Generates a validated draft. Each provider gets up to 2 attempts; the second
 * attempt is told what was wrong with the first.
 */
export async function generateDraft(cfg, topic, { recentTitles = [], recentOpenings = [], log = console.log, retryDelayMs = 15_000 } = {}) {
  const providers = [];
  // Google retires model names over time, so try each configured Gemini model in order.
  if (cfg.gemini.apiKey) {
    for (const model of cfg.gemini.models) {
      providers.push([`gemini (${model})`, (p) => gemini({ apiKey: cfg.gemini.apiKey, model }, p)]);
    }
  }
  if (cfg.groq.apiKey) {
    for (const model of cfg.groq.models) {
      providers.push([`groq (${model})`, (p) => groq({ apiKey: cfg.groq.apiKey, model }, p)]);
    }
  }

  const errors = [];
  for (const [name, call] of providers) {
    let feedback = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const draft = parseModelJson(await call(buildPrompt(topic, { recentTitles, recentOpenings, feedback })));
        const problems = validateDraft(draft);
        if (problems.length === 0) return { draft, provider: name };
        log(`  ${name} attempt ${attempt} rejected: ${problems.join('; ')}`);
        feedback = problems;
        errors.push(`${name}: ${problems.join('; ')}`);
      } catch (err) {
        log(`  ${name} attempt ${attempt} failed: ${err.message}`);
        errors.push(`${name}: ${err.message}`);
        // 404 = model retired or unknown; retrying it won't help, move to the next one.
        if (err.status === 404) break;
        // 429 / 5xx ("high demand") are usually brief: pause before trying again.
        // Groq's free tier allows ~8k tokens a minute, so a long post plus a retry can hit it.
        if ((err.status === 429 || err.status >= 500) && retryDelayMs > 0 && attempt < 2) {
          const wait = Math.min(err.retryAfterMs ?? retryDelayMs, MAX_RETRY_WAIT_MS);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
  }
  throw new Error(`Could not generate a usable post:\n${errors.join('\n')}`);
}
