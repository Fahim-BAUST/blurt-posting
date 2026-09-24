import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrivateKey, Signature } from '@beblurt/dblurt';
import { imageChallengeDigest, signImage } from '../src/blurt.js';

test('image signature follows the ImageSigningChallenge scheme and recovers the posting key', () => {
  const key = PrivateKey.fromSeed('unit-test-only-not-a-real-key');
  const image = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]);

  const sigHex = signImage(image, key);
  assert.match(sigHex, /^[0-9a-f]{130}$/);

  const recovered = Signature.fromString(sigHex).recover(imageChallengeDigest(image));
  assert.equal(recovered.toString(), key.createPublic().toString());
});
