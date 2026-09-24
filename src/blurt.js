// Blurt chain access: account lookup, image upload, post broadcast.
import { Client, PrivateKey, buildPostOperation, cryptoUtils } from '@beblurt/dblurt';

export function createClient(rpcUrls) {
  return new Client(rpcUrls, { timeout: 20_000 });
}

export async function getAccount(client, username) {
  const [account] = await client.condenser.getAccounts([username]);
  if (!account) throw new Error(`Blurt account "${username}" not found`);
  return account;
}

// Same scheme as blurt.blog's uploader: sign sha256("ImageSigningChallenge" + bytes).
export function imageChallengeDigest(imageBuffer) {
  return cryptoUtils.sha256(Buffer.concat([Buffer.from('ImageSigningChallenge'), imageBuffer]));
}

export function signImage(imageBuffer, key) {
  return key.sign(imageChallengeDigest(imageBuffer)).toString();
}

/** Uploads to Blurt's image host; returns the public image URL. */
export async function uploadImage({ uploadUrl, username, postingKey, image, filename = 'image.jpg', mime = 'image/jpeg' }) {
  const key = PrivateKey.fromString(postingKey);
  const form = new FormData();
  form.append('file', new Blob([image], { type: mime }), filename);

  const res = await fetch(`${uploadUrl.replace(/\/$/, '')}/${username}/${signImage(image, key)}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Image upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.error || !json.url) {
    throw new Error(`Image upload failed (${res.status}): ${json.error ?? text.slice(0, 200)}`);
  }
  return json.url;
}

export function buildPost({ username, title, body, tags, imageUrl, app }) {
  return buildPostOperation({
    author: username,
    title,
    body,
    tags,
    app,
    format: 'markdown',
    maxTags: 5,
    // Short time-based suffix keeps permlinks unique even if a title repeats.
    permlinkSuffix: Date.now().toString(36),
    extra: { image: [imageUrl] },
  });
}

export async function publish(client, operation, postingKey) {
  const key = PrivateKey.fromString(postingKey);
  return client.broadcast.sendOperations([operation], key);
}
