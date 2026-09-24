// Reads configuration from environment variables (GitHub Actions secrets or a local .env).
// Secrets are never logged.

import { CATEGORY_IDS, getCategory } from './categories.js';

const DEFAULT_RPC = ['https://rpc.blurt.blog', 'https://rpc.beblurt.com', 'https://blurt-rpc.saboin.com'];

const list = (v, fallback) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback);
const num = (v, fallback) => (v === undefined || v === '' ? fallback : Number(v));

export function loadConfig(env = process.env) {
  return {
    blurt: {
      username: env.BLURT_USERNAME?.trim().replace(/^@/, ''),
      postingKey: env.BLURT_POSTING_KEY?.trim(),
      rpcUrls: list(env.BLURT_RPC_URLS, DEFAULT_RPC),
      uploadUrl: env.BLURT_UPLOAD_URL || 'https://img-upload.blurt.blog',
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY?.trim(),
      // Comma-separated; tried in order. All three are on Gemini's free tier (checked 24 Sep 2026).
      models: list(env.GEMINI_MODEL, ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite']),
    },
    groq: {
      apiKey: env.GROQ_API_KEY?.trim(),
      // Comma-separated; tried in order (checked against Groq's model list 24 Sep 2026).
      models: list(env.GROQ_MODEL, ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']),
    },
    cloudflare: {
      accountId: env.CF_ACCOUNT_ID?.trim(),
      apiToken: env.CF_API_TOKEN?.trim(),
    },
    // Which categories to rotate through, e.g. "health,crypto". Default: all of them.
    categories: list(env.POST_CATEGORIES, CATEGORY_IDS).map((id) => getCategory(id.toLowerCase()).id),
    schedule: {
      minHours: num(env.MIN_INTERVAL_HOURS, 7),
      maxHours: num(env.MAX_INTERVAL_HOURS, 9),
    },
    // Unset/empty -> each category's own disclaimer (GitHub passes unset values as "").
    // "none" disables it; any other text replaces it for every category.
    footerOverride: !env.POST_FOOTER ? null : env.POST_FOOTER === 'none' ? '' : env.POST_FOOTER,
    app: 'blurt-auto-poster/2.0',
  };
}

/** Throws with a list of every missing setting needed for the requested mode. */
export function assertConfig(cfg, { needBlurt }) {
  const missing = [];
  if (!cfg.gemini.apiKey && !cfg.groq.apiKey) missing.push('GEMINI_API_KEY (or GROQ_API_KEY)');
  if (needBlurt) {
    if (!cfg.blurt.username) missing.push('BLURT_USERNAME');
    if (!cfg.blurt.postingKey) missing.push('BLURT_POSTING_KEY');
  }
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
}
