// Entry point.
//   node src/run.js            post if due (what the scheduler runs)
//   node src/run.js --force    post now, ignoring the schedule and double-post guard
//   node src/run.js --preview  generate text + image into ./preview, post nothing
import { mkdir, writeFile } from 'node:fs/promises';
import { loadConfig, assertConfig } from './config.js';
import { isDue, pickNextPostAt, recentlyPostedOnChain } from './schedule.js';
import { loadState, saveState } from './state.js';
import { pickTopic } from './topics.js';
import { generateDraft } from './llm.js';
import { generateImage, sniffImageType } from './image.js';
import { composeBody, firstSentence } from './compose.js';
import { tagsFor } from './categories.js';
import { pickRelated } from './related.js';
import { fetchRecentPosts, recentContext } from './recent.js';

const args = new Set(process.argv.slice(2));
const preview = args.has('--preview');
const force = args.has('--force');

const ist = (d) =>
  new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' IST';

async function main() {
  const cfg = loadConfig();
  assertConfig(cfg, { needBlurt: !preview });
  const state = await loadState();
  const now = new Date();

  if (!preview && !force && !isDue(state, now)) {
    console.log(`Not due yet. Next post at ${ist(state.nextPostAt)}.`);
    return;
  }

  const blurt = await import('./blurt.js');
  const client = blurt.createClient(cfg.blurt.rpcUrls);
  if (!preview) {
    const account = await blurt.getAccount(client, cfg.blurt.username);
    console.log(`Account @${account.name}, balance ${account.balance} (posting fees are paid from this).`);
    // If a previous run posted but failed to save state, don't post again too soon.
    if (!force && recentlyPostedOnChain(account.last_root_post, now, cfg.schedule.minHours - 1)) {
      const next = pickNextPostAt(new Date(`${account.last_root_post}Z`), cfg.schedule);
      console.log(`Chain shows a post at ${account.last_root_post} UTC; rescheduling to ${ist(next)}.`);
      await saveState({ ...state, nextPostAt: next.toISOString() });
      return;
    }
  }

  const topic = pickTopic(state.history, { categories: cfg.categories });
  const footer = cfg.footerOverride ?? topic.category.footer;
  console.log(`Topic: ${topic.key} | format: ${topic.format}`);

  // Recent posts steer the model away from repeats and supply "You might also like" links.
  // Read-only and optional: if the chain can't be reached, post without them.
  let recentPosts = [];
  if (cfg.blurt.username) {
    try {
      recentPosts = await fetchRecentPosts(client, cfg.blurt.username);
    } catch (err) {
      console.log(`Could not read recent posts (${err.message}); continuing without related links.`);
    }
  }
  const { titles: recentTitles, openings: recentOpenings } = recentContext(
    recentPosts,
    state.history.slice(-15).map((h) => h.title).filter(Boolean),
  );
  const related = pickRelated(recentPosts, tagsFor(topic)[0]);
  console.log(`Opening style: ${topic.opening} | related links: ${related.length}`);

  const { draft, provider: textProvider } = await generateDraft(cfg, topic, { recentTitles, recentOpenings });
  console.log(`Text (${textProvider}): "${draft.title}"`);

  const { image, provider: imageProvider } = await generateImage(cfg, draft.image_prompt);
  const { ext, mime } = sniffImageType(image);
  console.log(`Image (${imageProvider}): ${Math.round(image.length / 1024)} KB ${ext}`);

  const tags = tagsFor(topic);

  if (preview) {
    await mkdir('preview', { recursive: true });
    await writeFile(`preview/image.${ext}`, image);
    const body = composeBody(draft, { imageUrl: `image.${ext}`, footer, related });
    await writeFile('preview/post.md', `# ${draft.title}\n\nTags: ${tags.join(', ')}\n\n${body}`);
    console.log('Preview written to preview/post.md and preview/image.' + ext);
    return;
  }

  const imageUrl = await blurt.uploadImage({
    uploadUrl: cfg.blurt.uploadUrl,
    username: cfg.blurt.username,
    postingKey: cfg.blurt.postingKey,
    image,
    filename: `health-tip.${ext}`,
    mime,
  });
  console.log(`Uploaded image: ${imageUrl}`);

  const body = composeBody(draft, { imageUrl, footer, related });
  const op = blurt.buildPost({ username: cfg.blurt.username, title: draft.title, body, tags, imageUrl, app: cfg.app });
  const confirmation = await blurt.publish(client, op, cfg.blurt.postingKey);
  const permlink = op[1].permlink;
  console.log(`Posted: https://blurt.blog/${tags[0]}/@${cfg.blurt.username}/${permlink} (tx ${confirmation.id})`);

  const next = pickNextPostAt(new Date(), cfg.schedule);
  state.history.push({
    at: new Date().toISOString(),
    topicKey: topic.key,
    title: draft.title,
    permlink,
    opening: topic.opening,
    firstSentence: firstSentence(draft.body),
  });
  state.nextPostAt = next.toISOString();
  await saveState(state);
  console.log(`Next post scheduled for ${ist(next)}.`);
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
