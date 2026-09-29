// Reads the account's recent posts from the chain (read-only, no key needed).
// Used for related-post links and to steer the model away from repeated titles/openings.
import { firstSentence } from './compose.js';
import { isOurs } from './related.js';

export async function fetchRecentPosts(client, username, limit = 20) {
  return client.condenser.getDiscussions('blog', { tag: username, limit });
}

export function recentContext(posts, historyTitles = []) {
  const ours = posts.filter(isOurs);
  const titles = [...new Set([...ours.map((p) => p.title), ...historyTitles])].slice(0, 15);
  const openings = ours.slice(0, 8).map((p) => firstSentence(p.body)).filter(Boolean);
  return { titles, openings };
}
