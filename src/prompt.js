// Builds the writing prompt. The aim is warm, natural, genuinely useful writing,
// without invented personal stories or medical claims.

export function buildPrompt(topic, { recentTitles = [], feedback = [] } = {}) {
  const avoid = recentTitles.length
    ? `\nRecent titles on this blog (do not repeat their angle or wording):\n${recentTitles.map((t) => `- ${t}`).join('\n')}\n`
    : '';
  const fix = feedback.length
    ? `\nYour previous attempt had these problems, fix them:\n${feedback.map((p) => `- ${p}`).join('\n')}\n`
    : '';

  return `You write a friendly health and wellness blog on Blurt, a community blogging site.

Write one post about: ${topic.theme.label}
For: ${topic.audience.label}
Format: ${topic.format}
${avoid}${fix}
Writing style:
- Sound like a thoughtful person talking to a friend: plain words, contractions, varied sentence length, a little warmth.
- Open with a relatable everyday moment or a surprising fact instead of a generic intro.
- Be specific and practical (what to do, when, how long), grounded in mainstream public-health guidance (WHO, national health services).
- Use markdown: short paragraphs, "##" subheadings, lists where they help. Do not start the body with a "#" title.
- 350-650 words.
- Avoid clichés such as "in today's fast-paced world", "delve", "unlock", "game-changer", "journey", "embark", and avoid overusing em dashes.
- Do NOT invent personal anecdotes, fake credentials, statistics you are unsure of, or quotes.
- Do NOT give medication or supplement names with doses, or diagnose anything. Where relevant, say when to see a doctor.
- For children, only suggest things parents can safely supervise.
- End with a short, natural question inviting readers to share their own habit in the comments.

Also write an image prompt for a realistic, bright, uplifting photo that fits the post:
no text, no words, no logos, no watermarks, no medical gore, natural diverse people or objects.

Reply with ONLY this JSON object:
{
  "title": "catchy but honest title, under 90 characters, no clickbait",
  "body": "the full post in markdown",
  "tags": ["3 or 4 lowercase single-word or hyphenated tags, e.g. wellness, nutrition, fitness, lifestyle"],
  "image_prompt": "detailed photo description, 30-60 words",
  "image_alt": "short plain description of the image"
}`;
}
