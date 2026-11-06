// Weekly numbers for Rimi Lab's YouTube and Instagram: what people watched, how long they stayed, what they saved and shared.
// Writes reports/<date>.json and reports/latest.md. The daily and weekly Short tasks read latest.md when they pick topics.
// YouTube needs the yt-analytics.readonly scope (and youtube.force-ssl or youtube.readonly for titles); Instagram uses IG_TOKEN.
// Secrets are never printed or written. A part that cannot be read is reported as such, and the rest still runs.
import { writeFileSync, mkdirSync } from 'node:fs';

const env = process.env;
const DAYS = 28;
const day = (d) => d.toISOString().slice(0, 10);
const end = new Date(Date.now() - 86400e3), start = new Date(end.getTime() - (DAYS - 1) * 86400e3);
const secrets = [env.YT_CLIENT_ID, env.YT_CLIENT_SECRET, env.YT_REFRESH_TOKEN, env.IG_TOKEN].filter(Boolean);
const hide = (s) => secrets.reduce((m, x) => m.replaceAll(x, '<secret>'), String(s)).slice(0, 240);
const lab = (text = '') => /Chapters/.test(text) ? 'explainer'
  : /apod|Every day.s picture|cosmos\.rimilab\.com\/?$/im.test(text) && /NASA/.test(text) ? 'picture of the day'
  : /models\.rimilab/.test(text) ? 'Models' : /cosmos\.rimilab/.test(text) ? 'Cosmos'
  : /mba\.rimilab|rimilab\.com\/#\/mba|mba\.rimilab\.com/.test(text) ? 'MBA' : 'other';

async function youtube() {
  if (!env.YT_REFRESH_TOKEN) return { error: 'YouTube secrets not set' };
  const t = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) });
  const tok = await t.json();
  if (!t.ok) return { error: `sign-in: ${tok.error}` };
  if (!/yt-analytics/.test(tok.scope || '')) return { error: 'the yt-analytics.readonly permission is not granted yet' };
  const H = { Authorization: `Bearer ${tok.access_token}` };
  const q = (params) => fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ids: 'channel==MINE', startDate: day(start), endDate: day(end), ...params })}`, { headers: H }).then(async (r) => {
    const j = await r.json(); if (!r.ok) throw new Error(`analytics: ${r.status} ${j.error?.message || ''}`); return j; });
  const total = await q({ metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,shares' });
  const per = await q({ dimensions: 'video', metrics: 'views,averageViewDuration,averageViewPercentage,likes,shares,subscribersGained', sort: '-views', maxResults: '50' });
  const cols = (j) => j.columnHeaders.map((c) => c.name);
  const row = (j, r) => Object.fromEntries(cols(j).map((c, i) => [c, r[i]]));
  const vids = (per.rows || []).map((r) => row(per, r));
  // titles and descriptions, to know which lab each video came from
  const meta = {};
  for (let i = 0; i < vids.length; i += 50) {
    const ids = vids.slice(i, i + 50).map((v) => v.video).join(',');
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}`, { headers: H }).then((r) => r.json());
    for (const v of r.items || []) meta[v.id] = { title: v.snippet.title, lab: lab(`${v.snippet.title}\n${v.snippet.description}`), published: v.snippet.publishedAt.slice(0, 10) };
  }
  return { totals: total.rows?.[0] ? row(total, total.rows[0]) : {}, videos: vids.map((v) => ({ ...v, ...(meta[v.video] || {}) })) };
}

async function instagram() {
  if (!env.IG_TOKEN) return { error: 'IG_TOKEN not set' };
  const T = env.IG_TOKEN, API = T.startsWith('EAA') ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com';
  const get = async (path) => { const r = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}access_token=${T}`); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error?.message || r.status); return j; };
  let me;
  if (T.startsWith('EAA')) { const pages = await get('me/accounts?fields=instagram_business_account'); const id = pages.data.find((p) => p.instagram_business_account)?.instagram_business_account.id; me = await get(`${id}?fields=id,username,followers_count,media_count`); }
  else me = await get('me?fields=user_id,username,followers_count,media_count');
  const igId = me.id || me.user_id;
  const media = (await get(`${igId}/media?fields=id,caption,media_product_type,timestamp,permalink,like_count,comments_count&limit=40`)).data
    .filter((m) => Date.parse(m.timestamp) >= start.getTime());
  let insightsError = null;
  for (const m of media) {
    try {
      const ins = await get(`${m.id}/insights?metric=views,reach,saved,shares,total_interactions`);
      for (const x of ins.data) m[x.name] = x.values?.[0]?.value ?? x.total_value?.value ?? 0;
    } catch (e) { insightsError = hide(e.message); }
    m.lab = lab(m.caption);
    m.caption = (m.caption || '').split('\n')[0].slice(0, 90);
  }
  return { followers: me.followers_count, posts: me.media_count, media, insightsError };
}

function summary(yt, ig) {
  const L = [`# Rimi Lab weekly numbers`, ``, `Last ${DAYS} days: ${day(start)} to ${day(end)}. Made ${new Date().toISOString().slice(0, 16)}Z.`, ``];
  const byLab = (items, val) => {
    const g = {}; for (const x of items) { (g[x.lab || 'other'] ||= []).push(val(x)); }
    return Object.entries(g).map(([k, a]) => [k, a.length, a.reduce((s, v) => s + v, 0) / a.length]).sort((a, b) => b[2] - a[2]);
  };
  L.push('## YouTube', '');
  if (yt.error) L.push(`Not read: ${yt.error}.`, '');
  else {
    const t = yt.totals;
    L.push(`Views ${t.views ?? 0}. Watch time ${Math.round(t.estimatedMinutesWatched ?? 0)} minutes. Subscribers +${t.subscribersGained ?? 0} / -${t.subscribersLost ?? 0}. Likes ${t.likes ?? 0}. Shares ${t.shares ?? 0}.`, '');
    const v = yt.videos.filter((x) => x.views > 0);
    L.push('Top by views:', '', '| Video | Lab | Views | Stayed (avg %) | Subs |', '|---|---|---|---|---|');
    for (const x of v.slice(0, 8)) L.push(`| ${x.title || x.video} | ${x.lab || ''} | ${x.views} | ${Math.round(x.averageViewPercentage)}% | ${x.subscribersGained} |`);
    const ret = [...v].filter((x) => x.views >= 20).sort((a, b) => b.averageViewPercentage - a.averageViewPercentage);
    if (ret.length) L.push('', `Held people best (20+ views): ${ret.slice(0, 3).map((x) => `${x.title} (${Math.round(x.averageViewPercentage)}%)`).join('; ')}.`);
    L.push('', 'Average per video, by lab (views, then % watched):', '');
    const ret2 = Object.fromEntries(byLab(v, (x) => x.averageViewPercentage).map(([k, , a]) => [k, a]));
    for (const [k, n, a] of byLab(v, (x) => x.views)) L.push(`- ${k}: ${n} videos, ${Math.round(a)} views each, ${Math.round(ret2[k])}% watched`);
  }
  L.push('', '## Instagram', '');
  if (ig.error) L.push(`Not read: ${ig.error}.`);
  else {
    L.push(`Followers ${ig.followers}. Posts ${ig.posts}. Posts in this window ${ig.media.length}.`, '');
    if (ig.insightsError) L.push(`Per-post insights not read (${ig.insightsError}); likes and comments only.`, '');
    const score = (m) => (m.saved || 0) * 3 + (m.shares || 0) * 3 + (m.like_count || 0) + (m.comments_count || 0) * 2;
    L.push('| Post | Lab | Views | Saves | Shares | Likes |', '|---|---|---|---|---|---|');
    for (const m of [...ig.media].sort((a, b) => score(b) - score(a)).slice(0, 8)) L.push(`| [${m.caption}](${m.permalink}) | ${m.lab} | ${m.views ?? ''} | ${m.saved ?? ''} | ${m.shares ?? ''} | ${m.like_count} |`);
    L.push('', 'Average per post, by lab (saves + shares count three times):', '');
    for (const [k, n, a] of byLab(ig.media, score)) L.push(`- ${k}: ${n} posts, score ${a.toFixed(1)}`);
  }
  L.push('', '## For the topic pickers', '', 'Lean toward the labs and kinds of hook at the top of both lists. Keep the rotation, but when two topics are equally good, pick the one closer to what held people best. Small numbers move a lot week to week: never drop a lab on one week alone.');
  return L.join('\n') + '\n';
}

const settle = async (f) => { try { return await f(); } catch (e) { return { error: hide(e.message) }; } };
const yt = await settle(youtube), ig = await settle(instagram);
mkdirSync('reports', { recursive: true });
writeFileSync(`reports/${day(new Date())}.json`, JSON.stringify({ from: day(start), to: day(end), youtube: yt, instagram: ig }, null, 1) + '\n');
const md = summary(yt, ig);
writeFileSync('reports/latest.md', md);
console.log(md);
