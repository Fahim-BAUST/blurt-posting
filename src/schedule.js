// Pure scheduling helpers. All times are UTC Date objects / ISO strings.

const HOUR_MS = 60 * 60 * 1000;

/** True when a post is due. A missing nextPostAt means "never posted" -> due. */
export function isDue(state, now = new Date()) {
  if (!state?.nextPostAt) return true;
  return new Date(state.nextPostAt).getTime() <= now.getTime();
}

/**
 * Picks the next post time uniformly between minHours and maxHours from `from`,
 * rounded to the minute, so gaps look like 7h12m, 8h47m, 7h58m...
 */
export function pickNextPostAt(from, { minHours, maxHours, random = Math.random }) {
  if (!(minHours > 0) || !(maxHours >= minHours)) {
    throw new Error(`Invalid posting window: ${minHours}h-${maxHours}h`);
  }
  const gapMs = (minHours + random() * (maxHours - minHours)) * HOUR_MS;
  const next = new Date(from.getTime() + gapMs);
  next.setUTCSeconds(0, 0);
  return next;
}

/**
 * Safety net against double posting (e.g. state commit failed after a post).
 * `lastRootPost` is the account's `last_root_post` from the chain: UTC, no trailing Z.
 */
export function recentlyPostedOnChain(lastRootPost, now, withinHours) {
  if (!lastRootPost) return false;
  const iso = /z$/i.test(lastRootPost) ? lastRootPost : `${lastRootPost}Z`;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || t <= 0) return false;
  return now.getTime() - t < withinHours * HOUR_MS;
}
