// Saves NASA EONET's open natural events to live/eonet.json, as a backup copy for Rimi Lab Cosmos.
// The site asks EONET first; when EONET is busy or down, it reads this copy instead. Runs every six hours.
import { writeFileSync, mkdirSync } from 'node:fs';
const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30';
let last;
for (let i = 0; i < 4; i++) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'RimiLab-backup/1.0 (educational site)' }, signal: AbortSignal.timeout(30000) });
    if (r.ok) {
      const j = await r.json();
      if (!Array.isArray(j.events)) throw new Error('no events array');
      mkdirSync('live', { recursive: true });
      writeFileSync('live/eonet.json', JSON.stringify({ savedAt: new Date().toISOString(), source: url, reply: j }));
      console.log(`saved ${j.events.length} events`);
      process.exit(0);
    }
    last = `status ${r.status}`;
  } catch (e) { last = e.message; }
  await new Promise((ok) => setTimeout(ok, 20000 * (i + 1)));
}
console.log(`EONET did not answer (${last}); keeping the previous copy`);
