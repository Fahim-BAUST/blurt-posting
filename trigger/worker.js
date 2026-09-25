// Cloudflare Worker (free plan) that starts the GitHub workflow on a reliable schedule.
// GitHub's own cron is best-effort and often skips runs; Cloudflare Cron Triggers don't.
// The workflow still decides whether a post is actually due, so extra triggers are harmless.
//
// Secret (Worker > Settings > Variables and Secrets):
//   GITHUB_TOKEN  fine-grained token, this repo only, permission "Actions: Read and write"
// Plain variables (optional, defaults below):
//   GITHUB_REPO   owner/repo
//   WORKFLOW_FILE post.yml

const DEFAULT_REPO = 'Fahim-BAUST/blurt-posting';
const DEFAULT_WORKFLOW = 'post.yml';

async function dispatch(env) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const workflow = env.WORKFLOW_FILE || DEFAULT_WORKFLOW;
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'blurt-post-trigger',
    },
    // No inputs: the workflow's default (force = false) applies, so it only posts when due.
    body: JSON.stringify({ ref: 'main' }),
  });
  // GitHub answers 204 No Content on success.
  if (res.status !== 204) throw new Error(`GitHub dispatch failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },

  // Visiting the Worker URL shows whether it's configured; it never triggers a run.
  async fetch(_request, env) {
    const ok = Boolean(env.GITHUB_TOKEN);
    return new Response(ok ? 'Blurt trigger is configured.' : 'GITHUB_TOKEN secret is missing.', { status: ok ? 200 : 500 });
  },
};
