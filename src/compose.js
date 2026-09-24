// Turns the model's draft into a validated Blurt post body and tag list.

const MIN_WORDS = 250;
const MAX_WORDS = 1000;
const MAX_TITLE = 120;

/** Extracts the JSON object from a model reply (tolerates code fences / chatter). */
export function parseModelJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model reply contained no JSON object');
  return JSON.parse(text.slice(start, end + 1));
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
  }
  return problems;
}

export function composeBody(draft, { imageUrl, footer }) {
  const parts = [`![${draft.image_alt.replace(/[[\]]/g, '')}](${imageUrl})`, draft.body.trim()];
  if (footer?.trim()) parts.push('---', footer.trim());
  return `${parts.join('\n\n')}\n`;
}

/** Category first, then the model's tags; lowercase slugs, unique, max 5. */
export function finalTags(modelTags = [], category) {
  const slug = (t) => String(t).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const tags = [category, ...modelTags].map(slug).filter(Boolean);
  return [...new Set(tags)].slice(0, 5);
}
