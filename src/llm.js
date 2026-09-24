// Text generation: Google Gemini (free tier) first, Groq (free tier) as fallback.
import { parseModelJson, validateDraft } from './compose.js';
import { buildPrompt } from './prompt.js';

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${new URL(url).host} returned ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function gemini({ apiKey, model }, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const json = await postJson(url, { 'x-goog-api-key': apiKey }, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
  });
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new Error(`Gemini returned no text (finishReason: ${json.candidates?.[0]?.finishReason ?? 'unknown'})`);
  return text;
}

async function groq({ apiKey, model }, prompt) {
  const json = await postJson('https://api.groq.com/openai/v1/chat/completions', { authorization: `Bearer ${apiKey}` }, {
    model,
    temperature: 0.9,
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
export async function generateDraft(cfg, topic, { recentTitles = [], log = console.log } = {}) {
  const providers = [];
  if (cfg.gemini.apiKey) providers.push(['gemini', (p) => gemini(cfg.gemini, p)]);
  if (cfg.groq.apiKey) providers.push(['groq', (p) => groq(cfg.groq, p)]);

  const errors = [];
  for (const [name, call] of providers) {
    let feedback = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const draft = parseModelJson(await call(buildPrompt(topic, { recentTitles, feedback })));
        const problems = validateDraft(draft);
        if (problems.length === 0) return { draft, provider: name };
        log(`  ${name} attempt ${attempt} rejected: ${problems.join('; ')}`);
        feedback = problems;
        errors.push(`${name}: ${problems.join('; ')}`);
      } catch (err) {
        log(`  ${name} attempt ${attempt} failed: ${err.message}`);
        errors.push(`${name}: ${err.message}`);
      }
    }
  }
  throw new Error(`Could not generate a usable post:\n${errors.join('\n')}`);
}
