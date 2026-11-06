// Prints how many seconds until the next queue item is due, or -1 when nothing is waiting.
// Usage: node scripts/next-due.mjs <queue dir> <key that marks an item as done>
import { readdirSync, readFileSync } from 'node:fs';
const [dir, doneKey] = process.argv.slice(2);
const now = Date.now();
let next = Infinity;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'status.json')) {
  try {
    const q = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    const t = Date.parse(q.when);
    if (!q[doneKey] && t > now) next = Math.min(next, t);
  } catch { /* skip a broken file */ }
}
console.log(next === Infinity ? -1 : Math.ceil((next - now) / 1000));
