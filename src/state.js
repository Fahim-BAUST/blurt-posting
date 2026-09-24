// Persists schedule + post history in state/state.json (committed back by the workflow).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'state', 'state.json');
const MAX_HISTORY = 150;

export async function loadState(path = STATE_PATH) {
  try {
    const s = JSON.parse(await readFile(path, 'utf8'));
    return { nextPostAt: s.nextPostAt ?? null, history: Array.isArray(s.history) ? s.history : [] };
  } catch (err) {
    if (err.code === 'ENOENT') return { nextPostAt: null, history: [] };
    throw err;
  }
}

export async function saveState(state, path = STATE_PATH) {
  const out = { nextPostAt: state.nextPostAt, history: state.history.slice(-MAX_HISTORY) };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(out, null, 2)}\n`);
}
