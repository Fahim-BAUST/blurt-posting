// Picks the author's earlier posts to link at the end of a new one.

const MAX_RELATED = 3;

/** True for posts written by this bot (older, hand-written posts are left alone). */
export const isOurs = (post) => {
  try {
    return /^blurt-(auto|health)-poster\//.test(JSON.parse(post.json_metadata).app ?? '');
  } catch {
    return false;
  }
};

/**
 * `recentPosts` is newest-first, as returned by the chain. Prefers posts in the same
 * category; tops up from other categories so a new category still gets links.
 */
export function pickRelated(recentPosts, categoryTag) {
  const ours = recentPosts.filter(isOurs);
  const same = ours.filter((p) => p.category === categoryTag);
  const others = ours.filter((p) => p.category !== categoryTag);
  return [...same, ...others].slice(0, MAX_RELATED).map((p) => ({
    title: p.title,
    url: `https://blurt.blog/${p.category}/@${p.author}/${p.permlink}`,
  }));
}
