// Saves NASA's Astronomy Picture of the Day for the last few days into apod/.
// Every day gets apod/<date>.json (title, explanation, credit, links). The picture itself is saved as
// apod/<date>.jpg only when NASA owns it (public domain): the credit names NASA or a NASA centre and says
// nothing about copyright. Pictures owned by photographers are never copied here.
// Usage: node scripts/apod-fetch.mjs [days]   (NASA_API_KEY from the environment, or DEMO_KEY)
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
const days = Number(process.argv[2] || 3);
const key = process.env.NASA_API_KEY || 'DEMO_KEY';
const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
const iso = (d) => d.toISOString().slice(0, 10);
const strip = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const NASA = /\b(NASA|JPL|Goddard|Marshall|Ames|Johnson Space Center|Kennedy Space Center|Langley|Glenn Research)\b/i;
const url = `https://api.nasa.gov/planetary/apod?api_key=${key}&start_date=${iso(start)}&end_date=${iso(end)}&thumbs=true`;
const r = await fetch(url);
if (!r.ok) { console.log(`::warning::APOD answered ${r.status}`); process.exit(0); }
const list = await r.json();
mkdirSync('apod', { recursive: true });
for (const o of Array.isArray(list) ? list : [list]) {
  if (!o || !/^\d{4}-\d{2}-\d{2}$/.test(o.date || '')) continue;
  const rawCredit = strip(o.copyright ?? o.credit ?? '');
  const nasaOwned = NASA.test(rawCredit) && !/copyright|©/i.test(rawCredit) || (!o.copyright && !o.credit);
  const picture = o.media_type === 'image' ? (o.hdurl && /\.(jpe?g|png)$/i.test(o.hdurl) ? o.hdurl : o.url) : null;
  const rec = {
    date: o.date, title: strip(o.title), explanation: strip(o.explanation), credit: rawCredit || 'NASA',
    nasaOwned, mediaType: o.media_type, page: o.permalink || `https://apod.nasa.gov/apod/ap${o.date.slice(2, 4)}${o.date.slice(5, 7)}${o.date.slice(8)}.html`,
    picture: nasaOwned && picture ? `apod/${o.date}.jpg` : null,
  };
  if (rec.picture && !existsSync(rec.picture) && /\.(jpe?g|png)$/i.test(picture || '')) {
    const img = await fetch(picture);
    if (img.ok) writeFileSync(rec.picture, Buffer.from(await img.arrayBuffer())); else rec.picture = null;
  } else if (rec.picture && !/\.(jpe?g|png)$/i.test(picture || '')) rec.picture = null;
  writeFileSync(`apod/${o.date}.json`, JSON.stringify(rec, null, 1) + '\n');
  console.log(`${o.date} ${nasaOwned ? 'NASA-owned' : 'owner keeps copyright'}: ${rec.title}`);
}
