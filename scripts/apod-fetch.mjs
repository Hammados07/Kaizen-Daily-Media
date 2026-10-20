// Saves the Astronomy Picture of the Day for the last few days into apod/, for the story Shorts.
// It asks Rimi Lab Cosmos's own endpoint (cosmos.rimilab.com/api/apod), which already repairs NASA's
// placeholder entries and works out who owns each picture. Every day gets apod/<date>.json. The picture
// itself is saved as apod/<date>.jpg only when NASA owns it; pictures owned by photographers are never copied.
// Usage: node scripts/apod-fetch.mjs [days]
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
const days = Number(process.argv[2] || 3);
const iso = (d) => d.toISOString().slice(0, 10);
mkdirSync('apod', { recursive: true });
for (let k = 0; k < days; k++) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - k - 1);
  const date = iso(d);
  if (existsSync(`apod/${date}.json`)) continue;
  const r = await fetch(`https://cosmos.rimilab.com/api/apod?date=${date}`, { headers: { accept: 'application/json' } }).catch(() => null);
  const body = r && (await r.json().catch(() => null));
  if (!body?.ok || !body.data) { console.log(`::warning::${date}: ${body?.error || 'no answer'}`); continue; }
  const a = body.data;
  if (a.placeholder || a.fallback || a.date !== date) { console.log(`${date}: NASA has no complete entry yet, skipped`); continue; }
  const nasaOwned = !a.copyrighted;
  const rec = { date, title: a.title, explanation: a.explanation, credit: a.credit, nasaOwned, mediaType: a.mediaType, page: a.page, picture: null };
  const src = a.hdImage || a.image;
  if (nasaOwned && a.mediaType === 'image' && src && /\.(jpe?g|png)(\?|$)/i.test(src)) {
    const img = await fetch(src).catch(() => null);
    if (img?.ok) { rec.picture = `apod/${date}.jpg`; writeFileSync(rec.picture, Buffer.from(await img.arrayBuffer())); }
  }
  writeFileSync(`apod/${date}.json`, JSON.stringify(rec, null, 1) + '\n');
  console.log(`${date} ${nasaOwned ? 'NASA-owned' : 'owner keeps copyright'}: ${rec.title}`);
  await new Promise((res) => setTimeout(res, 1500));
}
