// Saves the Astronomy Picture of the Day for the last few days into apod/, for the story Shorts.
// It asks Rimi Lab Cosmos's own endpoint (cosmos.rimilab.com/api/apod), which already repairs NASA's
// placeholder entries and works out who owns each picture. Every day gets apod/<date>.json. The picture
// itself is saved as apod/<date>.jpg only when NASA owns it; pictures owned by photographers are never copied.
// When the photographer owns the day's picture, it also looks in the NASA Image and Video Library for a NASA picture
// of the same object and saves it as apod/<date>-alt.jpg with its record in "alt". The agent still checks it by eye.
// Usage: node scripts/apod-fetch.mjs [days]   (day 0 is today, in US time, so today's picture is caught once it is out)
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
const days = Number(process.argv[2] || 3);
const iso = (d) => d.toISOString().slice(0, 10);
mkdirSync('apod', { recursive: true });
const STOP = new Set(['the', 'and', 'of', 'in', 'on', 'over', 'from', 'with', 'a', 'an', 'to', 'at', 'its', 'new', 'complete', 'image', 'view', 'picture']);
const words = (s) => (s || '').toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)?/g) || [];
// NASA's own work only: no outside photographer, no copyright or ESA note in the text.
const nasaOnly = (m) => {
  const who = [m.photographer, m.secondary_creator].filter(Boolean).join(' ');
  if (who && !/\bnasa\b/i.test(who)) return false;
  if (/copyright|©|\besa\b|courtesy of/i.test(`${who} ${m.description || ''}`)) return false;
  return Boolean(m.center);
};
const ALT_V = 2; // bump to search again for records checked by an older version
// Catalogue names such as M104, IC 63, NGC 7000, Sh2-188 or Arp 78 make the best searches.
const catalogue = (t) => (t.match(/\b(?:M|NGC|IC|Sh2-|Arp|Abell|Pa)\s?-?\d+\b/g) || []).map((x) => x.replace(/\s+/g, ' '));
const distinct = (w) => /\d/.test(w) || !['nebula', 'galaxy', 'moon', 'moons', 'star', 'stars', 'sky', 'night', 'over', 'cloud', 'clouds'].includes(w);
async function findAlt(title, own = null) {
  const parts = own ? [own] : [...new Set([...catalogue(title), title.split(':')[1], title.split(':')[0], title].map((x) => (x || '').trim()).filter((x) => x.length > 1))];
  for (const q of parts) {
    const keys = words(q).filter((w) => !STOP.has(w));
    if (!keys.length) continue;
    const r = await fetch(`https://images-api.nasa.gov/search?media_type=image&page_size=60&q=${encodeURIComponent(q)}`).catch(() => null);
    const items = r?.ok ? (await r.json().catch(() => null))?.collection?.items || [] : [];
    const own = items.map((it) => it.data?.[0]).filter((m) => m && nasaOnly(m));
    const scored = own.map((m) => {
      const hay = new Set(words(`${m.title} ${(m.keywords || []).join(' ')}`));
      const hit = keys.filter((w) => hay.has(w));
      return { m, share: hit.length / keys.length, sharp: hit.some(distinct), inTitle: keys.filter((w) => words(m.title).includes(w)).length };
    }).filter((x) => x.sharp && x.share >= 0.5).sort((a, b) => b.share - a.share || b.inTitle - a.inTitle || (b.m.date_created || '').localeCompare(a.m.date_created || ''));
    console.log(`  search "${q}": ${items.length} results, ${own.length} NASA-only, ${scored.length} on subject`);
    for (const { m } of scored.slice(0, 3)) {
      const a = await fetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(m.nasa_id)}`).catch(() => null);
      const hrefs = a?.ok ? ((await a.json().catch(() => null))?.collection?.items || []).map((x) => x.href) : [];
      const href = ['~large.jpg', '~medium.jpg', '~orig.jpg'].map((s) => hrefs.find((h) => h.endsWith(s))).find(Boolean);
      if (!href) continue;
      return { query: q, nasaId: m.nasa_id, title: m.title, center: m.center, created: (m.date_created || '').slice(0, 10), description: (m.description || '').slice(0, 1500), page: `https://images.nasa.gov/details/${encodeURIComponent(m.nasa_id)}`, href: href.replace(/^http:/, 'https:') };
    }
  }
  return null;
}
async function addAlt(rec) {
  rec.altChecked = ALT_V;
  if (rec.nasaOwned || rec.alt) return;
  const alt = await findAlt(rec.title).catch(() => null);
  if (!alt) { console.log(`${rec.date}: no NASA picture of the same subject found`); return; }
  const img = await fetch(alt.href).catch(() => null);
  if (!img?.ok) return;
  const buf = Buffer.from(await img.arrayBuffer());
  if (buf.length > 15e6) return;
  writeFileSync(`apod/${rec.date}-alt.jpg`, buf);
  rec.alt = { ...alt, picture: `apod/${rec.date}-alt.jpg` };
  console.log(`${rec.date}: NASA picture of the same subject, ${alt.nasaId}: ${alt.title}`);
}
// The picture Short agent can ask for its own search: ALT_DATE=<date> ALT_QUERY="<words>" (from the workflow inputs).
if (process.env.ALT_DATE && process.env.ALT_QUERY && existsSync(`apod/${process.env.ALT_DATE}.json`)) {
  const f = `apod/${process.env.ALT_DATE}.json`, rec = JSON.parse(readFileSync(f, 'utf8'));
  if (!rec.nasaOwned) {
    const alt = await findAlt(rec.title, process.env.ALT_QUERY).catch(() => null);
    if (alt) {
      const img = await fetch(alt.href).catch(() => null);
      const buf = img?.ok ? Buffer.from(await img.arrayBuffer()) : null;
      if (buf && buf.length <= 15e6) { writeFileSync(`apod/${rec.date}-alt.jpg`, buf); rec.alt = { ...alt, picture: `apod/${rec.date}-alt.jpg`, askedFor: process.env.ALT_QUERY }; writeFileSync(f, JSON.stringify(rec, null, 1) + '\n'); console.log(`${rec.date}: asked-for search found ${alt.nasaId}: ${alt.title}`); }
    } else console.log(`${rec.date}: asked-for search "${process.env.ALT_QUERY}" found nothing NASA-only on subject`);
  }
}
// Fill in the NASA alternative for recent records saved before this step existed.
for (const f of readdirSync('apod').filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(-days)) {
  const rec = JSON.parse(readFileSync(`apod/${f}`, 'utf8'));
  if (rec.altChecked === ALT_V || rec.alt || rec.nasaOwned || rec.mediaType !== 'image') continue;
  await addAlt(rec);
  writeFileSync(`apod/${f}`, JSON.stringify(rec, null, 1) + '\n');
}
for (let k = 0; k < days; k++) {
  const d = new Date(Date.now() - 5 * 3600e3); d.setUTCDate(d.getUTCDate() - k); // US Eastern date, roughly
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
  if (rec.mediaType === 'image') await addAlt(rec);
  writeFileSync(`apod/${date}.json`, JSON.stringify(rec, null, 1) + '\n');
  console.log(`${date} ${nasaOwned ? 'NASA-owned' : 'owner keeps copyright'}: ${rec.title}`);
  await new Promise((res) => setTimeout(res, 1500));
}
