// Turns the model's draft into a validated Blurt post body.

const MIN_WORDS = 850;
const MAX_WORDS = 2000;
const MAX_TITLE = 120;

/** Extracts the JSON object from a model reply (tolerates code fences / chatter). */
export function parseModelJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model reply contained no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

// Checked on every post; they matter most for crypto but are never acceptable anywhere.
const HYPE = /\b(guaranteed (returns?|profits?|gains?|income)|to the moon|\d{2,}x (gains?|returns?)|(100|1000)x|get rich quick|risk[- ]free (profit|returns?|investment))\b/gi;
// Warning about hype is fine ("scammers promise guaranteed returns", "there are no guaranteed returns").
const WARNING_CONTEXT = /\b(no|not|never|nothing|nobody|isn'?t|aren'?t|without|don'?t|doesn'?t|beware|avoid|promis\w*|claim\w*|scam\w*|fake|red flags?|too good|anyone who|lure\w*)\b/i;

function hasHype(text) {
  for (const m of text.matchAll(HYPE)) {
    if (!WARNING_CONTEXT.test(text.slice(Math.max(0, m.index - 60), m.index))) return true;
  }
  return false;
}
const PRICE_PREDICTION = /\b(will|could|is going to|set to) (easily )?(reach|hit|surpass|climb to|pump to) \$\s?\d/i;

// Words and openings that make a post read as AI-written. The prompt asks the model to
// avoid them, but it doesn't reliably listen, so drafts are checked and rewritten.
export const CLICHES = /\b(unlock\w*|decod(ed|ing)|demystif\w*|delv(e|es|ed|ing)|navigat(e|es|ed|ing)|seamless\w*|game[- ]?changer\w*|embark\w*|journey|elevate\w*|empower\w*|harness\w*|realm|tapestry|ever[- ]evolving|fast[- ]paced|dive (in|into)|deep dive|look no further|buckle up|in today'?s (world|digital age)|at the end of the day|without further ado)\b/gi;
const FORMULAIC_OPENING = /^(have you ever|do you ever|imagine|picture this|it'?s \d|it is \d|you know (that|the) feeling|we'?ve all|we have all|in today'?s)/i;

/** First sentence of the article text, skipping the image and headings. */
export function firstSentence(markdown) {
  const text = markdown
    .split('\n')
    .filter((line) => line.trim() && !/^\s*(!\[|#)/.test(line))
    .join(' ')
    .trim();
  return (text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text).slice(0, 200);
}

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/** Returns a list of problems; an empty list means the draft is usable. */
export function validateDraft(d) {
  const problems = [];
  const has = (field) => typeof d?.[field] === 'string' && d[field].trim() !== '';
  for (const field of ['title', 'body', 'image_prompt', 'image_alt']) {
    if (!has(field)) problems.push(`missing ${field}`);
  }

  if (has('title') && d.title.length > MAX_TITLE) problems.push(`title longer than ${MAX_TITLE} chars`);
  if (has('body')) {
    const n = wordCount(d.body);
    if (n < MIN_WORDS || n > MAX_WORDS) problems.push(`body has ${n} words (want ${MIN_WORDS}-${MAX_WORDS})`);
    if (/^\s*#\s/.test(d.body)) problems.push('body starts with an H1 heading (title is shown separately)');
    if (/\b\d+(\.\d+)?\s?(mg|mcg|µg|iu)\b/i.test(d.body)) problems.push('body contains medication/supplement dosage');
    if (hasHype(`${d.title}\n${d.body}`)) problems.push('contains investment hype or promised returns');
    if (PRICE_PREDICTION.test(d.body)) problems.push('contains a price prediction');
    const opening = firstSentence(d.body);
    if (FORMULAIC_OPENING.test(opening)) problems.push(`formulaic opening ("${opening.slice(0, 40)}..."); start a different way`);
  }
  const cliches = [...new Set([...`${d?.title ?? ''}\n${d?.body ?? ''}`.matchAll(CLICHES)].map((m) => m[0].toLowerCase()))];
  if (cliches.length) problems.push(`uses AI-cliché words: ${cliches.join(', ')} (rephrase in plain words)`);
  return problems;
}

const linkText = (t) => t.replace(/[[\]]/g, '');
const imageMd = (alt, url) => `![${linkText(alt)}](${url})`;

/** The optional in-article images the model described: complete entries only, at most `max`. */
export function extraImagePlans(draft, max) {
  if (!Array.isArray(draft?.extra_images) || max < 1) return [];
  const ok = (v) => typeof v === 'string' && v.trim() !== '';
  return draft.extra_images.filter((img) => ok(img?.prompt) && ok(img?.alt)).slice(0, max);
}

// "## 2. Keep a Health Log!" -> "keep a health log", so the model's section names match loosely.
const headingKey = (s) =>
  s.replace(/^#+\s*/, '').replace(/^\d+[.)]?\s*/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();

// Puts each image just above a "##" section: the one the model said it illustrates, or else
// spread through the article. The first section sits right under the cover image and the
// recap is a summary, so neither gets one. Images that don't fit go at the end of the article.
function placeImages(body, images) {
  const lines = body.split('\n');
  const slots = lines
    .flatMap((line, i) => (/^##\s/.test(line) && !/^##\s+quick recap/i.test(line) ? [i] : []))
    .slice(1);
  const placed = new Map();
  const unmatched = [];
  for (const img of images) {
    const key = typeof img.section === 'string' ? headingKey(img.section) : '';
    const i = key ? slots.find((j) => !placed.has(j) && headingKey(lines[j]).includes(key)) : undefined;
    if (i === undefined) unmatched.push(img);
    else placed.set(i, img);
  }
  const free = slots.filter((j) => !placed.has(j));
  const n = Math.min(unmatched.length, free.length);
  unmatched.slice(0, n).forEach((img, k) => placed.set(free[Math.floor((k * free.length) / n)], img));
  for (const i of [...placed.keys()].sort((a, b) => b - a)) {
    lines.splice(i, 0, imageMd(placed.get(i).alt, placed.get(i).url), '');
  }
  return [lines.join('\n'), ...unmatched.slice(n).map((img) => imageMd(img.alt, img.url))].join('\n\n');
}

/** `images` are the extra in-article images ({ url, alt, section? }); the cover image goes on top. */
export function composeBody(draft, { imageUrl, images = [], footer, related = [] }) {
  const parts = [imageMd(draft.image_alt, imageUrl), placeImages(draft.body.trim(), images)];
  if (related.length) {
    parts.push(`## You might also like\n\n${related.map((r) => `- [${linkText(r.title)}](${r.url})`).join('\n')}`);
  }
  if (footer?.trim()) parts.push('---', footer.trim());
  return `${parts.join('\n\n')}\n`;
}
