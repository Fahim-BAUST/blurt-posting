// Content categories. Each has its own readers, themes, writing rules and disclaimer.
// Themes are evergreen on purpose: the AI models' knowledge is months old, so
// "latest news" style posts would risk stating outdated or invented facts.

// Tags were picked from on-chain activity (posts and distinct authors in the last
// 30 days, checked 24 Sep 2026). Unused tags (e.g. "productivity", "habits", "gadgets",
// "tips") were left out, and "actifit" was avoided because it's for Actifit app reports.
// "blurt" is the busiest general tag (~300 posts, 95 authors), then "blog".
export const ACTIVE_TAGS = [
  'health', 'wellness', 'life', 'food', 'fitness', 'mentalhealth',
  'crypto', 'blockchain', 'cryptocurrency', 'web3',
  'lifestyle', 'blurtlife', 'money', 'travel', 'nature',
  'technology', 'science', 'ai', 'privacy', 'cybersecurity', 'energy',
  'blurt', 'blog',
];
const GENERAL_TAGS = ['blurt', 'blog'];
const MAX_TAGS = 5;

const AI_NOTE = 'Written with AI assistance; image is AI-generated.';

const COMMON_FORMATS = [
  'a list of 6 practical tips, each with its own "##" section explaining how to do it, why it helps, and an everyday example',
  'myth vs fact: 5 common myths, each with its own section explaining where the myth comes from, what is actually true, and what to do instead',
  'a Q&A answering 6 questions people often ask, with a full, practical answer to each',
  'a detailed checklist people can save: 8-10 items, each with a short paragraph on how and why, grouped under "##" headings',
];

export const CATEGORIES = [
  {
    id: 'health',
    tags: ['health', 'wellness', 'life'],
    label: 'health and wellness',
    audiences: [
      { id: 'kids', label: 'children (5-12 years) and their parents' },
      { id: 'teens', label: 'teenagers (13-19 years)' },
      { id: 'young-adults', label: 'young adults in their 20s and 30s' },
      { id: 'midlife', label: 'adults in their 40s and 50s' },
      { id: 'seniors', label: 'seniors (60+) and people caring for them' },
      { id: 'family', label: 'the whole family, all ages together' },
    ],
    themes: [
      { id: 'hydration', label: 'drinking enough water through the day' },
      { id: 'sleep', label: 'better sleep habits' },
      { id: 'breakfast', label: 'a healthy, simple breakfast', tags: ['food'] },
      { id: 'veg-fruit', label: 'eating more vegetables and fruit', tags: ['food'] },
      { id: 'sugar', label: 'cutting back on added sugar', tags: ['food'] },
      { id: 'walking', label: 'daily walking and staying active', tags: ['fitness'] },
      { id: 'strength', label: 'gentle strength exercises at home', tags: ['fitness'] },
      { id: 'posture', label: 'posture and back care', tags: ['fitness'] },
      { id: 'screens', label: 'screen time and eye strain' },
      { id: 'stress', label: 'handling everyday stress', tags: ['mentalhealth'] },
      { id: 'mood', label: 'small habits for a better mood', tags: ['mentalhealth'] },
      { id: 'hygiene', label: 'hand washing and everyday hygiene' },
      { id: 'oral', label: 'teeth and gum care' },
      { id: 'sun', label: 'sun safety and heat' },
      { id: 'balance', label: 'balance, stretching and flexibility', tags: ['fitness'] },
      { id: 'social', label: 'staying connected with people', tags: ['mentalhealth'] },
      { id: 'snacks', label: 'smarter snacking', tags: ['food'] },
      { id: 'checkups', label: 'regular health check-ups and knowing when to see a doctor' },
    ],
    formats: [
      ...COMMON_FORMATS,
      'a full one-day routine from morning to night, with the reason behind each step and how to adapt it for a busy day',
      'a "small swaps" guide: 6 easy swaps from a less healthy habit to a better one, each explained with why it helps and how to make it stick',
    ],
    rules: [
      'Ground advice in mainstream public-health guidance (WHO, national health services).',
      'Do NOT give medication or supplement names with doses, or diagnose anything. Where relevant, say when to see a doctor.',
      'For children, only suggest things parents can safely supervise.',
    ],
    footer: `*These are general wellness tips, not medical advice. Please talk to a doctor about your own health. ${AI_NOTE}*`,
  },
  {
    id: 'crypto',
    tags: ['crypto', 'blockchain', 'cryptocurrency'],
    label: 'crypto and blockchain (educational)',
    audiences: [
      { id: 'beginners', label: 'complete beginners who are curious about crypto' },
      { id: 'holders', label: 'everyday people who already hold a little crypto' },
      { id: 'creators', label: 'bloggers and creators earning crypto on platforms like Blurt' },
      { id: 'skeptics', label: 'sceptical readers who want a plain, balanced explanation' },
    ],
    themes: [
      { id: 'wallet-security', label: 'keeping a crypto wallet secure' },
      { id: 'seed-phrase', label: 'what a seed/recovery phrase is and how to store it safely' },
      { id: 'scams', label: 'spotting common crypto scams and phishing' },
      { id: 'blockchain-basics', label: 'how a blockchain works, in plain words', tags: ['web3'] },
      { id: 'hot-vs-cold', label: 'hot wallets vs hardware (cold) wallets' },
      { id: 'keys', label: 'public keys, private keys and why "not your keys, not your coins" matters' },
      { id: 'stablecoins', label: 'what stablecoins are and their risks' },
      { id: 'fees', label: 'why crypto transactions have fees' },
      { id: 'volatility', label: 'understanding volatility and only risking what you can afford to lose' },
      { id: 'dyor', label: 'how to research a crypto project before trusting it' },
      { id: 'defi', label: 'what DeFi is, and its main risks', tags: ['web3'] },
      { id: 'nfts', label: 'what NFTs actually are', tags: ['web3'] },
      { id: 'records', label: 'keeping good records of crypto activity (for taxes and peace of mind)' },
      { id: 'exchanges', label: 'using exchanges safely: 2FA, withdrawals and account security' },
      { id: 'blurt-earning', label: 'how rewards work on social blockchains like Blurt (posting, curation, staking)' },
      { id: 'emotions', label: 'avoiding FOMO and panic decisions' },
    ],
    formats: [
      ...COMMON_FORMATS,
      'an in-depth plain-English explainer: what it is, how it works (using an everyday analogy), benefits, risks or limits, and 5 practical takeaways',
      'a "beginner mistakes" guide: 6 common mistakes, each with why people make it, what can go wrong, and how to avoid it',
    ],
    rules: [
      'This is education, not investment advice. Never tell readers to buy, sell or hold any specific coin or token.',
      'Do NOT make price predictions, promise returns, or use hype ("to the moon", "100x", "guaranteed").',
      'Do NOT quote current prices, market caps, or recent events and dates; they go out of date and may be wrong.',
      'Be balanced: mention risks honestly alongside benefits. Prioritise safety and security.',
      'Never ask readers to share keys or seed phrases, and remind them nobody legitimate will ask for them.',
    ],
    footer: `*This is general education, not financial advice. Crypto is risky; do your own research. ${AI_NOTE}*`,
  },
  {
    id: 'lifestyle',
    tags: ['lifestyle', 'life', 'blurtlife'],
    label: 'daily lifestyle',
    audiences: [
      { id: 'students', label: 'students' },
      { id: 'professionals', label: 'busy young professionals' },
      { id: 'parents', label: 'parents juggling work and family' },
      { id: 'remote', label: 'people working from home' },
      { id: 'retirees', label: 'retirees enjoying a slower pace' },
      { id: 'everyone', label: 'anyone wanting small daily improvements' },
    ],
    themes: [
      { id: 'morning', label: 'a calmer morning routine' },
      { id: 'evening', label: 'winding down in the evening' },
      { id: 'declutter', label: 'decluttering and keeping a tidy home' },
      { id: 'budget', label: 'simple budgeting and saving habits', tags: ['money'] },
      { id: 'meal-prep', label: 'easy meal planning and cooking at home', tags: ['food'] },
      { id: 'focus', label: 'staying focused and beating procrastination' },
      { id: 'time', label: 'managing time without burning out' },
      { id: 'digital-detox', label: 'taking breaks from phones and social media', tags: ['mentalhealth'] },
      { id: 'hobbies', label: 'finding and keeping a hobby' },
      { id: 'reading', label: 'building a reading habit' },
      { id: 'green', label: 'small eco-friendly habits at home', tags: ['nature'] },
      { id: 'friends', label: 'keeping friendships strong' },
      { id: 'weekend', label: 'making weekends restful and fun' },
      { id: 'travel', label: 'travelling on a budget', tags: ['travel'] },
      { id: 'self-care', label: 'simple self-care that is not expensive', tags: ['mentalhealth'] },
      { id: 'work-life', label: 'work-life balance' },
    ],
    formats: [
      ...COMMON_FORMATS,
      'a full one-day routine from morning to night, with the reason behind each step and how to adapt it for a busy day',
      'a "small swaps" guide: 6 easy swaps from a draining habit to a better one, each explained with why it helps and how to make it stick',
      'a 7-day mini challenge: one small action per day, each day with what to do, why, and a tip if it feels hard',
    ],
    rules: [
      'Keep suggestions realistic, low-cost and doable for people with ordinary budgets and schedules.',
      'Money tips should be general habits only, not specific investment or product recommendations.',
    ],
    footer: `*${AI_NOTE}*`,
  },
  {
    id: 'technology',
    tags: ['technology', 'science'],
    label: 'new technology explained simply',
    audiences: [
      { id: 'beginners', label: 'people who are not very techy' },
      { id: 'students', label: 'students' },
      { id: 'small-business', label: 'small business owners' },
      { id: 'parents', label: 'parents keeping their family safe online' },
      { id: 'seniors', label: 'seniors getting comfortable with new tech' },
      { id: 'enthusiasts', label: 'tech enthusiasts who like clear explanations' },
    ],
    themes: [
      { id: 'ai-assistants', label: 'using AI assistants and chatbots well in daily life', tags: ['ai'] },
      { id: 'ai-safety', label: 'using AI tools safely: privacy, checking facts, and their limits', tags: ['ai'] },
      { id: 'deepfakes', label: 'how to spot deepfakes and AI-generated misinformation', tags: ['ai'] },
      { id: 'passwords', label: 'password managers and strong passwords', tags: ['privacy'] },
      { id: 'passkeys', label: 'passkeys and two-factor authentication', tags: ['cybersecurity'] },
      { id: 'privacy', label: 'phone and app privacy settings worth checking', tags: ['privacy'] },
      { id: 'backups', label: 'backing up photos and files' },
      { id: 'battery', label: 'looking after phone and laptop batteries' },
      { id: 'smart-home', label: 'smart home devices: benefits and privacy trade-offs', tags: ['privacy'] },
      { id: 'wifi', label: 'getting better home Wi-Fi' },
      { id: 'ev', label: 'how electric vehicles work and what owning one is like', tags: ['energy'] },
      { id: 'solar', label: 'home solar power and batteries, explained simply', tags: ['energy'] },
      { id: 'cloud', label: 'what "the cloud" actually is' },
      { id: 'online-scams', label: 'common online scams and how to avoid them', tags: ['cybersecurity'] },
      { id: 'wearables', label: 'smartwatches and fitness trackers: what they can and cannot do' },
      { id: 'open-source', label: 'what open-source software is and why it matters' },
      { id: 'learning', label: 'free ways to learn new tech skills online' },
    ],
    formats: [
      ...COMMON_FORMATS,
      'an in-depth plain-English explainer: what it is, how it works (using an everyday analogy), benefits, risks or limits, and 5 practical takeaways',
      'a step-by-step "how to get started" guide in 6-7 steps, each with clear instructions, what to watch out for, and a tip',
    ],
    rules: [
      'Explain how the technology works and how people use it, in plain words, with everyday analogies.',
      'Do NOT name specific recent product launches, version numbers, prices, release dates or company news; they go out of date and may be wrong.',
      'Mention honest downsides (privacy, cost, limits) as well as benefits. No brand promotion.',
    ],
    footer: `*${AI_NOTE}*`,
  },
];

/**
 * Blurt tags for a post, max 5: the category's main tag first (it becomes the post's
 * category), then the theme's specific tag, the category's other tags, then general ones.
 */
export function tagsFor(topic) {
  const { category, theme } = topic;
  const [main, ...rest] = category.tags;
  return [...new Set([main, ...(theme.tags ?? []), ...rest, ...GENERAL_TAGS])].slice(0, MAX_TAGS);
}

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id) {
  const c = CATEGORIES.find((cat) => cat.id === id);
  if (!c) throw new Error(`Unknown category "${id}". Valid: ${CATEGORY_IDS.join(', ')}`);
  return c;
}
