// Posts to Instagram with Meta's own API (Instagram API with Instagram Login). No scheduler, no monthly cap.
// The token lives only in the IG_TOKEN secret. Usage: node scripts/ig-publish.mjs check | publish
// Queue: queue/ig/<name>.json = {"when": "<ISO time with offset>", "type": "REELS" | "IMAGE" | "CAROUSEL",
//   "media": ["https://raw.githubusercontent.com/..."], "caption": "..."}. Published entries move to queue/ig/done/.
import { readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
const T = process.env.IG_TOKEN, API = 'https://graph.instagram.com';
if (!T) { console.log('::warning::IG_TOKEN secret is not set yet; nothing posted'); process.exit(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(path, params = {}, method = 'GET') {
  const u = new URL(API + path);
  const body = new URLSearchParams({ ...params, access_token: T });
  const r = method === 'GET' ? await fetch(u + '?' + body) : await fetch(u, { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${path}: ${j.error?.message || r.status}`); // never prints the token
  return j;
}
async function ready(id) {
  for (let k = 0; k < 40; k++) {
    const s = await call(`/${id}`, { fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`container ${s.status_code}: ${s.status || ''}`);
    await sleep(15000);
  }
  throw new Error('container not ready after 10 minutes');
}
const mode = process.argv[2] || 'publish';
const me = await call('/me', { fields: 'user_id,username,account_type,media_count' });
console.log(`Instagram: @${me.username} (${me.account_type}), ${me.media_count} posts`);
if (mode === 'check') process.exit(0);
const now = Date.now();
for (const f of readdirSync('queue/ig').filter((f) => f.endsWith('.json')).sort()) {
  const p = `queue/ig/${f}`, q = JSON.parse(readFileSync(p, 'utf8'));
  if (q.publishedId || Date.parse(q.when) > now) continue;
  if (Date.parse(q.when) < now - 36 * 3600e3) { console.log(`::warning::${f} is over a day late; skipped`); continue; }
  try {
    let id;
    if (q.type === 'CAROUSEL') {
      const kids = [];
      for (const m of q.media) {
        const isVid = /\.mp4(\?|$)/i.test(m);
        const c = await call(`/${me.user_id}/media`, { is_carousel_item: 'true', ...(isVid ? { media_type: 'VIDEO', video_url: m } : { image_url: m }) }, 'POST');
        await ready(c.id); kids.push(c.id);
      }
      id = (await call(`/${me.user_id}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: q.caption }, 'POST')).id;
    } else if (q.type === 'REELS') {
      id = (await call(`/${me.user_id}/media`, { media_type: 'REELS', video_url: q.media[0], caption: q.caption, share_to_feed: 'true' }, 'POST')).id;
    } else {
      id = (await call(`/${me.user_id}/media`, { image_url: q.media[0], caption: q.caption }, 'POST')).id;
    }
    await ready(id);
    const pub = await call(`/${me.user_id}/media_publish`, { creation_id: id }, 'POST');
    q.publishedId = pub.id; q.publishedAt = new Date().toISOString();
    writeFileSync(p, JSON.stringify(q, null, 1) + '\n'); renameSync(p, `queue/ig/done/${f}`);
    console.log(`${f}: published ${pub.id}`);
  } catch (e) {
    q.lastError = String(e.message).slice(0, 300); q.tries = (q.tries || 0) + 1;
    writeFileSync(p, JSON.stringify(q, null, 1) + '\n');
    console.log(`::error::${f}: ${q.lastError}`);
  }
}
