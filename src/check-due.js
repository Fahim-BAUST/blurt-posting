// Cheap pre-check for the workflow: no dependencies, so npm install only runs when a post is due.
// Prints "due=true|false" (GitHub Actions output format).
import { isDue } from './schedule.js';
import { loadState } from './state.js';

const state = await loadState();
const due = isDue(state);
console.log(`due=${due}`);
console.error(due ? 'A post is due.' : `Next post not before ${state.nextPostAt} (UTC).`);
