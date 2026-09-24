// Image generation: Cloudflare Workers AI FLUX.1 schnell (free daily allowance) first,
// Pollinations.ai (free, no key; adds a small watermark) as fallback.

const STYLE = ', photorealistic, natural light, high detail, no text, no watermark';

async function cloudflareFlux({ accountId, apiToken }, prompt) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: prompt + STYLE, steps: 8 }),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Cloudflare returned ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const b64 = json.result?.image ?? json.image;
  if (!b64) throw new Error('Cloudflare returned no image');
  return Buffer.from(b64, 'base64');
}

async function pollinations(prompt) {
  const seed = Math.floor(Math.random() * 1e9);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + STYLE)}?width=1024&height=768&nologo=true&seed=${seed}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`Pollinations returned ${res.status}`);
  if (!res.headers.get('content-type')?.startsWith('image/')) throw new Error('Pollinations did not return an image');
  return Buffer.from(await res.arrayBuffer());
}

/** Returns { image: Buffer, provider }. */
export async function generateImage(cfg, prompt, { log = console.log } = {}) {
  const errors = [];
  if (cfg.cloudflare.accountId && cfg.cloudflare.apiToken) {
    try {
      return { image: await cloudflareFlux(cfg.cloudflare, prompt), provider: 'cloudflare-flux' };
    } catch (err) {
      log(`  cloudflare failed: ${err.message}`);
      errors.push(err.message);
    }
  }
  try {
    return { image: await pollinations(prompt), provider: 'pollinations' };
  } catch (err) {
    errors.push(err.message);
  }
  throw new Error(`Could not generate an image:\n${errors.join('\n')}`);
}

/** Detects JPEG/PNG/WebP so the upload gets the right filename and type. */
export function sniffImageType(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { ext: 'png', mime: 'image/png' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return { ext: 'jpg', mime: 'image/jpeg' };
}
