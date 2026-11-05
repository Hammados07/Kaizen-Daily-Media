// Saves GDACS disaster alerts (green, orange and red, last 21 days) to live/gdacs.json, as a backup copy for Rimi Lab Cosmos.
// The site asks GDACS first; when GDACS does not answer it in a usable form, it reads this copy instead. Runs every six hours.
import { writeFileSync, mkdirSync } from 'node:fs';
const day = (d) => d.toISOString().slice(0, 10);
const now = new Date(), from = new Date(now.getTime() - 21 * 86400e3);
const replies = {};
for (const level of ['Green', 'Orange', 'Red']) {
  const u = new URL('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH');
  u.searchParams.set('eventlist', 'EQ;TC;FL;VO;DR;WF'); u.searchParams.set('alertlevel', level);
  u.searchParams.set('fromDate', day(from)); u.searchParams.set('toDate', day(now)); u.searchParams.set('pageSize', '100');
  for (let i = 0; i < 3 && !replies[level.toLowerCase()]; i++) {
    try {
      const r = await fetch(u, { headers: { 'user-agent': 'RimiLab-backup/1.0 (educational site)', accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      if (r.ok) { const j = await r.json(); if (Array.isArray(j.features)) replies[level.toLowerCase()] = j; }
    } catch { /* try again */ }
    if (!replies[level.toLowerCase()]) await new Promise((ok) => setTimeout(ok, 15000 * (i + 1)));
  }
}
const got = Object.keys(replies);
if (!got.length) { console.log('GDACS did not answer; keeping the previous copy'); process.exit(0); }
mkdirSync('live', { recursive: true });
writeFileSync('live/gdacs.json', JSON.stringify({ savedAt: now.toISOString(), source: 'https://www.gdacs.org/', replies }));
console.log('saved levels:', got.join(', '), '; features:', got.map((k) => replies[k].features.length).join(', '));
