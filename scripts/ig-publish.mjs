// Posts to Instagram with Meta's own API (Instagram API with Instagram Login). No scheduler, no monthly cap.
// The token lives only in the IG_TOKEN secret. Usage: node scripts/ig-publish.mjs check | publish
// Queue: queue/ig/<name>.json = {"when": "<ISO time with offset>", "type": "REELS" | "IMAGE" | "CAROUSEL",
//   "media": ["https://raw.githubusercontent.com/..."], "caption": "..."}. Published entries move to queue/ig/done/.
import { readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
const T = (process.env.IG_TOKEN || '').trim();
// IGAA... tokens come from Instagram login (graph.instagram.com); EAA... tokens from Facebook login (graph.facebook.com).
const FB = T.startsWith('EAA'), API = FB ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com';
if (!T) { console.log('::warning::IG_TOKEN secret is not set yet; nothing posted'); process.exit(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// any failure before the queue loop is written to status.json (message only, never the token), so it can be read without logs
function fail(e) { // the message only, never the token, so the reason can be read without the run log
  const msg = String(e?.message || e).replaceAll(T, '<token>').slice(0, 300);
  writeFileSync('queue/ig/status.json', JSON.stringify({ checked: new Date().toISOString(), failed: msg }, null, 1) + '\n');
  console.log(`::error::${msg}`); process.exit(1);
}
async function call(path, params = {}, method = 'GET') {
  const u = new URL(API + path);
  const body = new URLSearchParams({ ...params, access_token: T });
  const r = method === 'GET' ? await fetch(u + '?' + body) : await fetch(u, { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${path}: ${j.error?.message || r.status}${j.error?.code ? ` (code ${j.error.code}${j.error.error_subcode ? '/' + j.error.error_subcode : ''})` : ''}`); // never prints the token
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
async function main() {
const mode = process.argv[2] || 'publish';
let me;
if (FB) {
  const pages = (await call('/me/accounts', { fields: 'name,instagram_business_account{id,username,media_count}' })).data || [];
  const pg = pages.find((x) => x.instagram_business_account);
  if (!pg) throw new Error('no Facebook Page with a linked Instagram account was found for this token');
  const a = pg.instagram_business_account;
  me = { user_id: a.id, username: a.username, account_type: `linked to Page ${pg.name}`, media_count: a.media_count };
} else me = await call('/me', { fields: 'user_id,username,account_type,media_count' });
console.log(`Instagram (${FB ? 'Facebook login' : 'Instagram login'}): @${me.username} (${me.account_type}), ${me.media_count} posts`);
writeFileSync('queue/ig/status.json', JSON.stringify({ checked: new Date().toISOString(), login: FB ? 'facebook' : 'instagram', username: me.username, account: me.account_type, posts: me.media_count }, null, 1) + '\n');
if (mode === 'refresh' && !FB) { // keeps the 60-day token alive; records days left, never the token
  const r = await call('/refresh_access_token', { grant_type: 'ig_refresh_token' });
  const st = JSON.parse(readFileSync('queue/ig/status.json', 'utf8'));
  st.token = { refreshed: new Date().toISOString(), daysLeft: Math.round(r.expires_in / 86400), sameToken: r.access_token === T };
  writeFileSync('queue/ig/status.json', JSON.stringify(st, null, 1) + '\n');
  if (!st.token.sameToken) console.log('::warning::Instagram gave a new token string. Paste a fresh token into the IG_TOKEN secret.');
  process.exit(0);
}
if (mode === 'check' || mode === 'refresh') process.exit(0);
if (mode === 'dry') { // makes a Reel container from a known video and waits for it, but never publishes it
  const url = process.argv[3];
  const c = await call(`/${me.user_id}/media`, { media_type: 'REELS', video_url: url, caption: 'test, not published' }, 'POST');
  await ready(c.id);
  const st = JSON.parse(readFileSync('queue/ig/status.json', 'utf8')); st.dryRun = { at: new Date().toISOString(), container: 'FINISHED', published: false };
  writeFileSync('queue/ig/status.json', JSON.stringify(st, null, 1) + '\n'); console.log('dry run: container ready, not published'); process.exit(0);
}
const now = Date.now();
for (const f of readdirSync('queue/ig').filter((f) => f.endsWith('.json') && f !== 'status.json').sort()) {
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
}
main().catch(fail);
