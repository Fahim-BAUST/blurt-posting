// Picks what to write next: first a category, then an unused audience x theme in it.
// History is used to avoid repeats and back-to-back sameness.
import { getCategory } from './categories.js';

/** Topic keys are "category:audience:theme"; older health-only keys were "audience:theme". */
export function parseTopicKey(key = '') {
  const parts = key.split(':');
  if (parts.length === 2) return { category: 'health', audience: parts[0], theme: parts[1] };
  return { category: parts[0], audience: parts[1], theme: parts[2] };
}

export function allTopics(categoryIds) {
  return categoryIds.flatMap((id) => {
    const category = getCategory(id);
    return category.audiences.flatMap((audience) =>
      category.themes.map((theme) => ({ key: `${id}:${audience.id}:${theme.id}`, category, audience, theme })),
    );
  });
}

const pick = (arr, random) => arr[Math.floor(random() * arr.length)];

/**
 * Never repeats the previous post's category (when more than one is enabled);
 * among the rest, the longer a category has waited, the more likely it is picked.
 * So the mix stays even without falling into a fixed, robotic order.
 */
function pickCategory(parsed, categoryIds, random) {
  const postsAgo = (id) => {
    const i = parsed.findLastIndex((p) => p.category === id);
    return i === -1 ? categoryIds.length + 1 : parsed.length - i;
  };
  const last = parsed.at(-1)?.category;
  const candidates = categoryIds.length > 1 ? categoryIds.filter((id) => id !== last) : categoryIds;
  const weights = candidates.map(postsAgo);
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates.at(-1);
}

/**
 * Picks an unused topic. Within the chosen category, prefers one whose audience and
 * theme both differ from that category's previous post; falls back as topics get used up.
 */
export function pickTopic(history = [], { categories, random = Math.random }) {
  const parsed = history.map((h) => ({ ...parseTopicKey(h.topicKey), key: h.topicKey }));
  const categoryId = pickCategory(parsed, categories, random);
  const category = getCategory(categoryId);

  const mine = parsed.filter((p) => p.category === categoryId);
  // Compare normalised keys so legacy "audience:theme" entries still count as used.
  const used = new Set(mine.map((p) => `${p.category}:${p.audience}:${p.theme}`));
  const last = mine.at(-1);
  const topics = allTopics([categoryId]);

  let pool = topics.filter((t) => !used.has(t.key));
  if (pool.length === 0) {
    // Every combination used: start a new cycle, only skipping this category's recent 20.
    const recent = new Set(mine.slice(-20).map((p) => `${p.category}:${p.audience}:${p.theme}`));
    pool = topics.filter((t) => !recent.has(t.key));
  }
  const varied = pool.filter((t) => t.audience.id !== last?.audience && t.theme.id !== last?.theme);
  const topic = pick(varied.length ? varied : pool, random);
  return { ...topic, format: pick(category.formats, random) };
}
