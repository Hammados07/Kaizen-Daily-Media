// Saves pictures from the NASA Image and Video Library into pick/, by NASA id or by search.
// Usage: node scripts/nasa-image.mjs "<id or search>|<id or search>|..."
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('pick', { recursive: true });
const api = 'https://images-api.nasa.gov';
for (const q of (process.argv[2] || '').split('|').map((s) => s.trim()).filter(Boolean)) {
  let id = q, meta = null;
  const s = await (await fetch(`${api}/search?media_type=image&q=${encodeURIComponent(q)}`)).json().catch(() => null);
  const items = s?.collection?.items || [];
  const exact = items.find((it) => it.data?.[0]?.nasa_id?.toLowerCase() === q.toLowerCase()) || items[0];
  if (!exact) { console.log(`${q}: nothing found`); continue; }
  meta = exact.data[0]; id = meta.nasa_id;
  const a = await (await fetch(`${api}/asset/${encodeURIComponent(id)}`)).json().catch(() => null);
  const hrefs = (a?.collection?.items || []).map((x) => x.href);
  const href = ['~orig.jpg', '~large.jpg', '~orig.png', '~large.png'].map((e) => hrefs.find((h) => h.endsWith(e))).find(Boolean);
  if (!href) { console.log(`${id}: no picture file`); continue; }
  const buf = Buffer.from(await (await fetch(href.replace(/^http:/, 'https:'))).arrayBuffer());
  if (buf.length > 40e6) { console.log(`${id}: too big`); continue; }
  const name = id.replace(/[^\w.-]+/g, '_');
  writeFileSync(`pick/${name}${href.match(/\.\w+$/)[0]}`, buf);
  writeFileSync(`pick/${name}.json`, JSON.stringify({ id, title: meta.title, center: meta.center, photographer: meta.photographer, secondary_creator: meta.secondary_creator, date: meta.date_created, description: meta.description, page: `https://images.nasa.gov/details/${id}` }, null, 1));
  console.log(`${id}: saved, ${meta.title}`);
}
