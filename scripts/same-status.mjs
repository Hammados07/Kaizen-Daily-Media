// Exits 0 when a queue status file differs from the last commit only in its "checked" time
// (and in the order of words in "scope"). Usage: node scripts/same-status.mjs <status.json>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const f = process.argv[2];
const norm = (t) => {
  const j = JSON.parse(t);
  delete j.checked;
  if (typeof j.scope === 'string') j.scope = j.scope.split(' ').sort().join(' ');
  return JSON.stringify(j);
};
try {
  const old = execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8' });
  process.exit(norm(old) === norm(readFileSync(f, 'utf8')) ? 0 : 1);
} catch { process.exit(1); }
