// Reads configuration from environment variables (GitHub Actions secrets or a local .env).
// Secrets are never logged.

const DEFAULT_RPC = ['https://rpc.blurt.blog', 'https://rpc.beblurt.com', 'https://blurt-rpc.saboin.com'];

const DEFAULT_FOOTER =
  '*These are general wellness tips, not medical advice. Please talk to a doctor about your own health. ' +
  'Written with AI assistance; image is AI-generated.*';

const list = (v, fallback) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback);
const num = (v, fallback) => (v === undefined || v === '' ? fallback : Number(v));

export function loadConfig(env = process.env) {
  return {
    blurt: {
      username: env.BLURT_USERNAME?.trim().replace(/^@/, ''),
      postingKey: env.BLURT_POSTING_KEY?.trim(),
      rpcUrls: list(env.BLURT_RPC_URLS, DEFAULT_RPC),
      uploadUrl: env.BLURT_UPLOAD_URL || 'https://img-upload.blurt.blog',
      category: env.BLURT_CATEGORY || 'health',
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY?.trim(),
      // Comma-separated; tried in order. All three are on Gemini's free tier (checked 24 Sep 2026).
      models: list(env.GEMINI_MODEL, ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite']),
    },
    groq: {
      apiKey: env.GROQ_API_KEY?.trim(),
      model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
    cloudflare: {
      accountId: env.CF_ACCOUNT_ID?.trim(),
      apiToken: env.CF_API_TOKEN?.trim(),
    },
    schedule: {
      minHours: num(env.MIN_INTERVAL_HOURS, 7),
      maxHours: num(env.MAX_INTERVAL_HOURS, 9),
    },
    // Unset/empty -> default footer (GitHub passes unset secrets as ""). "none" disables it.
    footer: !env.POST_FOOTER ? DEFAULT_FOOTER : env.POST_FOOTER === 'none' ? '' : env.POST_FOOTER,
    app: 'blurt-health-poster/1.0',
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
