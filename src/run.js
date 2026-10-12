// Entry point.
//   node src/run.js            post if due (what the scheduler runs)
//   node src/run.js --force    post now, ignoring the schedule and double-post guard
//   node src/run.js --preview  generate text + images into ./preview, post nothing
import { mkdir, writeFile } from 'node:fs/promises';
import { loadConfig, assertConfig } from './config.js';
import { isDue, pickNextPostAt, recentlyPostedOnChain } from './schedule.js';
import { loadState, saveState } from './state.js';
import { pickTopic } from './topics.js';
import { generateDraft } from './llm.js';
import { generateImage, generateExtraImages, sniffImageType } from './image.js';
import { composeBody, extraImagePlans, firstSentence } from './compose.js';
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

  // The cover image is required; extra in-article images are skipped if they fail.
  const cover = await generateImage(cfg, draft.image_prompt);
  const extras = await generateExtraImages(cfg, extraImagePlans(draft, cfg.imagesPerPost - 1));
  const images = [{ ...cover, alt: draft.image_alt }, ...extras].map((img) => ({ ...img, ...sniffImageType(img.image) }));
  for (const img of images) console.log(`Image (${img.provider}): ${Math.round(img.image.length / 1024)} KB ${img.ext}`);

  const tags = tagsFor(topic);

  if (preview) {
    await mkdir('preview', { recursive: true });
    const names = images.map((img, i) => `image${i ? `-${i + 1}` : ''}.${img.ext}`);
    for (const [i, img] of images.entries()) await writeFile(`preview/${names[i]}`, img.image);
    const body = composeBody(draft, { imageUrl: names[0], images: images.slice(1).map((img, i) => ({ ...img, url: names[i + 1] })), footer, related });
    await writeFile('preview/post.md', `# ${draft.title}\n\nTags: ${tags.join(', ')}\n\n${body}`);
    console.log(`Preview written to preview/post.md and ${names.map((n) => `preview/${n}`).join(', ')}`);
    return;
  }

  const upload = (img, n) =>
    blurt.uploadImage({
      uploadUrl: cfg.blurt.uploadUrl,
      username: cfg.blurt.username,
      postingKey: cfg.blurt.postingKey,
      image: img.image,
      filename: `${tags[0]}-${n}.${img.ext}`,
      mime: img.mime,
    });
  const imageUrl = await upload(images[0], 1);
  console.log(`Uploaded image: ${imageUrl}`);
  const uploaded = [];
  for (const [i, img] of images.slice(1).entries()) {
    try {
      uploaded.push({ url: await upload(img, i + 2), alt: img.alt, section: img.section });
      console.log(`Uploaded image: ${uploaded.at(-1).url}`);
    } catch (err) {
      console.log(`Extra image upload skipped: ${err.message}`);
    }
  }

  const body = composeBody(draft, { imageUrl, images: uploaded, footer, related });
  const op = blurt.buildPost({
    username: cfg.blurt.username,
    title: draft.title,
    body,
    tags,
    imageUrls: [imageUrl, ...uploaded.map((img) => img.url)],
    app: cfg.app,
  });
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
