// Topic bank: every audience x theme pair, plus a varied post format.
// History is used to avoid repeats and back-to-back sameness.

export const AUDIENCES = [
  { id: 'kids', label: 'children (5-12 years) and their parents' },
  { id: 'teens', label: 'teenagers (13-19 years)' },
  { id: 'young-adults', label: 'young adults in their 20s and 30s' },
  { id: 'midlife', label: 'adults in their 40s and 50s' },
  { id: 'seniors', label: 'seniors (60+) and people caring for them' },
  { id: 'family', label: 'the whole family, all ages together' },
];

export const THEMES = [
  { id: 'hydration', label: 'drinking enough water through the day' },
  { id: 'sleep', label: 'better sleep habits' },
  { id: 'breakfast', label: 'a healthy, simple breakfast' },
  { id: 'veg-fruit', label: 'eating more vegetables and fruit' },
  { id: 'sugar', label: 'cutting back on added sugar' },
  { id: 'walking', label: 'daily walking and staying active' },
  { id: 'strength', label: 'gentle strength exercises at home' },
  { id: 'posture', label: 'posture and back care' },
  { id: 'screens', label: 'screen time and eye strain' },
  { id: 'stress', label: 'handling everyday stress' },
  { id: 'mood', label: 'small habits for a better mood' },
  { id: 'hygiene', label: 'hand washing and everyday hygiene' },
  { id: 'oral', label: 'teeth and gum care' },
  { id: 'sun', label: 'sun safety and heat' },
  { id: 'balance', label: 'balance, stretching and flexibility' },
  { id: 'social', label: 'staying connected with people' },
  { id: 'snacks', label: 'smarter snacking' },
  { id: 'checkups', label: 'regular health check-ups and knowing when to see a doctor' },
];

export const FORMATS = [
  'a list of 5 practical tips, each with a short "why it helps"',
  'myth vs fact: 4 common myths, each followed by the fact',
  'a simple one-day routine from morning to night',
  'a short Q&A answering 4 questions people often ask',
  'a quick-start checklist people can save, with a short intro',
  'a "small swaps" guide: 5 easy swaps from a less healthy habit to a better one',
];

export function allTopics() {
  return AUDIENCES.flatMap((audience) =>
    THEMES.map((theme) => ({ key: `${audience.id}:${theme.id}`, audience, theme })),
  );
}

const pick = (arr, random) => arr[Math.floor(random() * arr.length)];

/**
 * Picks an unused topic. Prefers one whose audience and theme both differ
 * from the previous post; falls back gracefully as the bank gets used up.
 */
export function pickTopic(history = [], { random = Math.random } = {}) {
  const topics = allTopics();
  const used = new Set(history.map((h) => h.topicKey));
  const last = history.at(-1)?.topicKey?.split(':') ?? [];

  let pool = topics.filter((t) => !used.has(t.key));
  if (pool.length === 0) {
    // Every combination used: start a new cycle, only skipping the most recent 20.
    const recent = new Set(history.slice(-20).map((h) => h.topicKey));
    pool = topics.filter((t) => !recent.has(t.key));
  }
  const varied = pool.filter((t) => t.audience.id !== last[0] && t.theme.id !== last[1]);
  const topic = pick(varied.length ? varied : pool, random);
  return { ...topic, format: pick(FORMATS, random) };
}
