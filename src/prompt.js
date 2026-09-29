// Builds the writing prompt. The aim is warm, natural, genuinely useful writing,
// without invented personal stories, hype, or claims the model can't back up.

export function buildPrompt(topic, { recentTitles = [], recentOpenings = [], feedback = [] } = {}) {
  const { category } = topic;
  const avoid = recentTitles.length
    ? `\nRecent titles on this blog (do not repeat their angle, wording or "X: Y" pattern):\n${recentTitles.map((t) => `- ${t}`).join('\n')}\n`
    : '';
  const openings = recentOpenings.length
    ? `\nRecent opening sentences on this blog (start differently from all of these):\n${recentOpenings.map((o) => `- ${o}`).join('\n')}\n`
    : '';
  const fix = feedback.length
    ? `\nYour previous attempt had these problems, fix them:\n${feedback.map((p) => `- ${p}`).join('\n')}\n`
    : '';

  return `You write a friendly blog on Blurt, a community blogging site, covering health, daily lifestyle, technology and crypto.

Write one ${category.label} post about: ${topic.theme.label}
For: ${topic.audience.label}
Format: ${topic.format}
Open the post with: ${topic.opening ?? 'a direct, useful statement'}
${avoid}${openings}${fix}
Writing style:
- Sound like a thoughtful person talking to a friend: plain words, contractions, varied sentence length, a little warmth.
- Never start with "Have you ever", "Do you ever", "Imagine", "Picture this", "It is <time>", or "You know that feeling".
- Be specific and practical (what to do, when, how long).
- Go deep, not wide: for each main point, explain what to do, why it works in plain terms, a concrete everyday example, and a common mistake or a tip to make it stick.
- Start with 2-3 short paragraphs on why this matters to these readers. Near the end, add a "## Quick recap" with 4-6 bullet points.
- Use markdown: short paragraphs, "##" subheadings, lists where they help. Do not start the body with a "#" title.
- Length: 1100-1400 words. This is a long-form article; do not stop early or pad with filler.
- Never use these words or phrases (drafts containing them are rejected): unlock, decode, demystify, delve, navigate, seamless, game-changer, embark, journey, elevate, empower, harness, realm, tapestry, ever-evolving, fast-paced, dive into, deep dive, look no further, buckle up, in today's world, at the end of the day. Use at most two em dashes.
- Do NOT invent personal anecdotes, fake credentials, statistics you are unsure of, or quotes.
- End with a short, natural question inviting readers to share their own experience in the comments.

Rules for ${category.label} posts:
${category.rules.map((r) => `- ${r}`).join('\n')}

Also write an image prompt for a realistic, bright, uplifting photo that fits the post:
no text, no words, no numbers, no logos, no screens showing readable content, no watermarks, natural diverse people or objects.

Reply with ONLY this JSON object:
{
  "title": "catchy but honest title, under 90 characters, no clickbait",
  "image_prompt": "detailed photo description, 30-60 words",
  "image_alt": "short plain description of the image",
  "body": "the full post in markdown"
}`;
}
