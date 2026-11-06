// Rimi Lab Publisher: uploads our own videos to our own YouTube channel with the YouTube Data API v3.
// Scopes: youtube.upload (videos.insert, thumbnails.set). With youtube.force-ssl also granted, it adds each upload to its lab's
// playlist (playlists, playlistItems) and uploads captions for explainers (captions.insert). It reads only our own channel.
// Secrets (never printed or written): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.
// Usage: node scripts/yt-upload.mjs check | test <repo path to an mp4> [private|unlisted] | publish | backfill
//   backfill: puts every public video already on the channel into its lab's playlist (needs youtube.force-ssl).
// Queue: queue/yt/<name>.json = {"when": "<ISO time with offset>", "file": "<repo path to the mp4>",
//   "title": "...", "description": "...", "tags": ["..."], "short": true, "thumbnail": "<optional repo path to a jpg>",
//   "captions": "<optional repo path to an .srt>", "playlist": "<optional: mba | models | cosmos | apod | explainers>"}
// Playlist ids and which videos are already in them are kept in queue/yt-state.json.
// Every upload ends with the "Like and subscribe" card (4 s on Shorts, 10 s on explainers) (scripts/endcard.mjs), unless the entry says "endcard": false.
// Uploaded entries move to queue/yt/done/ with the video id. Results are written to queue/yt/status.json.
import { readdirSync, readFileSync, writeFileSync, renameSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { addEndcard } from './endcard.mjs';
const { YT_CLIENT_ID: ID = '', YT_CLIENT_SECRET: SECRET = '', YT_REFRESH_TOKEN: REFRESH = '' } = process.env;
const STATUS = 'queue/yt/status.json';
mkdirSync('queue/yt/done', { recursive: true });
const hide = (s) => [ID, SECRET, REFRESH].filter(Boolean).reduce((m, x) => m.replaceAll(x, '<secret>'), String(s));
const save = (o) => writeFileSync(STATUS, JSON.stringify({ checked: new Date().toISOString(), ...o }, null, 1) + '\n');
function fail(e) { const msg = hide(e?.message || e).slice(0, 300); save({ failed: msg }); console.log(`::error::${msg}`); process.exit(1); }
if (!ID || !SECRET || !REFRESH) { console.log('::warning::YouTube secrets are not set yet; nothing uploaded'); process.exit(0); }

async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    body: new URLSearchParams({ client_id: ID, client_secret: SECRET, refresh_token: REFRESH, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`sign-in: ${j.error || r.status} ${j.error_description || ''}`);
  return { token: j.access_token, scope: j.scope };
}

// ------------------------------------------------------------------ playlists and captions (need youtube.force-ssl)
const STATE = 'queue/yt-state.json';
const loadState = () => { try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return { playlists: {}, added: {} }; } };
const saveState = (st) => writeFileSync(STATE, JSON.stringify(st, null, 1) + '\n');
export const PLAYLISTS = {
  mba: ['Rimi Lab MBA', 'Business ideas you can drag: Shorts from the free labs at mba.rimilab.com.'],
  models: ['Rimi Lab Models', 'Machine learning and AI you can try: Shorts from the free labs at models.rimilab.com.'],
  cosmos: ['Rimi Lab Cosmos', 'The physics of everything you see: Shorts from the free labs at cosmos.rimilab.com.'],
  apod: ['NASA picture of the day', 'One space picture a day, explained in plain words. Every day\u2019s picture: cosmos.rimilab.com.'],
  explainers: ['Rimi Lab explainers', 'Five-minute explainers, one idea at a time, with a free lab to try it yourself at rimilab.com.'],
};
// Which playlist a video belongs to, from its queue entry or from its title and description on the channel.
export function playlistFor({ playlist, title = '', description = '', file = '', short }) {
  if (playlist) return playlist;
  const isShort = short ?? /#shorts/i.test(title);
  if (!isShort || (/Chapters/.test(description) && !/#shorts/i.test(title))) return 'explainers';
  if (/apod/i.test(file) || /Every day\u2019s picture|Every day's picture|APOD/i.test(description)) return 'apod';
  if (/models\.rimilab\.com/.test(description)) return 'models';
  if (/cosmos\.rimilab\.com/.test(description)) return 'cosmos';
  if (/mba\.rimilab\.com|rimilab\.com\/#\/mba/.test(description)) return 'mba';
  return null;
}
async function gapi(T, method, path, body, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await gapi1(T, method, path, body); }
    catch (e) { // a new playlist can answer 404 or 409 for a short while after it is made
      if (i >= tries || !/: (404|409|5\d\d) /.test(e.message)) throw e;
      await new Promise((ok) => setTimeout(ok, 8000 * i));
    }
  }
}
async function gapi1(T, method, path, body) {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, { method,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path.split('?')[0]}: ${r.status} ${j.error?.message || ''}`);
  return j;
}
async function listAll(T, path) {
  const items = []; let page = '';
  do { const j = await gapi(T, 'GET', `${path}&maxResults=50${page ? `&pageToken=${page}` : ''}`); items.push(...(j.items || [])); page = j.nextPageToken || ''; } while (page);
  return items;
}
async function playlistId(T, st, key) {
  if (st.playlists[key]) return st.playlists[key];
  const [title, description] = PLAYLISTS[key];
  const mine = await listAll(T, 'playlists?part=snippet&mine=true');
  let id = mine.find((p) => p.snippet.title === title)?.id;
  if (!id) id = (await gapi(T, 'POST', 'playlists?part=snippet,status', { snippet: { title, description, defaultLanguage: 'en' }, status: { privacyStatus: 'public' } })).id;
  st.playlists[key] = id;
  if (!st.added[key]) st.added[key] = (await listAll(T, `playlistItems?part=contentDetails&playlistId=${id}`)).map((i) => i.contentDetails.videoId);
  return id;
}
async function addToPlaylist(T, st, key, videoId) {
  const id = await playlistId(T, st, key);
  st.added[key] ||= [];
  if (st.added[key].includes(videoId)) return false;
  await gapi(T, 'POST', 'playlistItems?part=snippet', { snippet: { playlistId: id, resourceId: { kind: 'youtube#video', videoId } } });
  st.added[key].push(videoId);
  return true;
}
async function uploadCaptions(T, videoId, file) {
  const boundary = `rimilab${Date.now()}`;
  const meta = JSON.stringify({ snippet: { videoId, language: 'en', name: 'English', isDraft: false } });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    readFileSync(file), Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const r = await fetch('https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart', { method: 'POST', body,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': `multipart/related; boundary=${boundary}` } });
  if (!r.ok) throw new Error(`captions.insert: ${r.status} ${((await r.json().catch(() => ({}))).error?.message) || ''}`);
}
// After uploads: put each finished video in its playlist and add explainer captions. Never stops the run.
async function followups(T) {
  const st = loadState(), notes = [];
  for (const f of readdirSync('queue/yt/done').filter((f) => f.endsWith('.json'))) {
    const p = `queue/yt/done/${f}`, q = JSON.parse(readFileSync(p, 'utf8'));
    let changed = false;
    try {
      if (!q.playlistDone) { const key = playlistFor(q); if (key) { await addToPlaylist(T, st, key, q.videoId); } q.playlistDone = key || 'none'; changed = true; notes.push(`${f}: playlist ${q.playlistDone}`); }
      if (q.captions && !q.captionsDone) { await uploadCaptions(T, q.videoId, q.captions); q.captionsDone = true; changed = true; notes.push(`${f}: captions`); }
      delete q.followupError;
    } catch (e) { q.followupError = hide(e.message).slice(0, 200); changed = true; console.log(`::warning::${f}: ${q.followupError}`); }
    if (changed) writeFileSync(p, JSON.stringify(q, null, 1) + '\n');
  }
  saveState(st);
  return notes;
}
async function backfill(T) {
  const st = loadState();
  const ch = await gapi(T, 'GET', 'channels?part=contentDetails&mine=true');
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const vids = await listAll(T, `playlistItems?part=snippet,status&playlistId=${uploads}`);
  const added = {}, skipped = [];
  for (const v of vids) {
    const { title, description } = v.snippet, videoId = v.snippet.resourceId.videoId;
    if (v.status?.privacyStatus !== 'public' || /^Rimi Lab Publisher test/.test(title)) { skipped.push(title); continue; }
    const key = playlistFor({ title, description });
    if (!key) { skipped.push(title); continue; }
    if (await addToPlaylist(T, st, key, videoId)) added[key] = (added[key] || 0) + 1;
  }
  st.backfilled = new Date().toISOString();
  saveState(st);
  return { videos: vids.length, added, skipped };
}

async function upload(T, q0) {
  const q = { ...q0 };
  let tmp = null;
  if (q.endcard !== false) { tmp = `${tmpdir()}/yt-${Date.now()}.mp4`; addEndcard(q.file, tmp); q.file = tmp; }
  try { return await send(T, q); } finally { if (tmp) rmSync(tmp, { force: true }); }
}

async function send(T, q) {
  const size = statSync(q.file).size;
  const title = (q.title + (q.short && !/#shorts/i.test(q.title) ? ' #shorts' : '')).slice(0, 100);
  const meta = {
    snippet: { title, description: (q.description || '').slice(0, 5000), tags: q.tags || [], categoryId: q.categoryId || '27' },
    status: { privacyStatus: q.privacy || 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: false },
  };
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', body: JSON.stringify(meta),
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) } });
  if (!start.ok) throw new Error(`videos.insert: ${start.status} ${(await start.text()).slice(0, 200)}`);
  const put = await fetch(start.headers.get('location'), { method: 'PUT', body: readFileSync(q.file),
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'video/mp4' } });
  const v = await put.json().catch(() => ({}));
  if (!put.ok || !v.id) throw new Error(`upload: ${put.status} ${v.error?.message || ''}`);
  if (q.thumbnail) {
    const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${v.id}`, { method: 'POST',
      body: readFileSync(q.thumbnail), headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'image/jpeg' } });
    if (!t.ok) console.log(`::warning::thumbnail not set (${t.status}); the video is up`);
  }
  return { id: v.id, privacy: v.status?.privacyStatus };
}

async function main() {
  const mode = process.argv[2] || 'publish';
  const { token: T, scope } = await accessToken();
  const base = { signedIn: true, scope };
  const wide = /youtube\.force-ssl|auth\/youtube( |$)/.test(scope || '');
  if (mode === 'check') { save(base); console.log('signed in; scope:', scope); return; }
  if (mode === 'backfill') {
    if (!wide) throw new Error('backfill needs the youtube.force-ssl permission; sign in again with it');
    const r = await backfill(T); save({ ...base, backfill: r }); console.log(JSON.stringify(r)); return;
  }
  if (mode === 'test') { // a private test upload, used for the audit evidence
    const file = process.argv[3], privacy = process.argv[4] === 'unlisted' ? 'unlisted' : 'private';
    const r = await upload(T, { file, title: 'Rimi Lab Publisher test upload', description: 'Test of our upload tool.', privacy });
    save({ ...base, test: { at: new Date().toISOString(), file, ...r } }); console.log('test upload', r.id, r.privacy); return;
  }
  const now = Date.now(), done = [];
  for (const f of readdirSync('queue/yt').filter((f) => f.endsWith('.json') && f !== 'status.json').sort()) {
    const p = `queue/yt/${f}`, q = JSON.parse(readFileSync(p, 'utf8'));
    if (q.videoId || Date.parse(q.when) > now) continue;
    if (Date.parse(q.when) < now - 36 * 3600e3) { console.log(`::warning::${f} is over a day late; skipped`); continue; }
    try {
      const r = await upload(T, q);
      Object.assign(q, { videoId: r.id, privacyStatus: r.privacy, uploadedAt: new Date().toISOString() });
      writeFileSync(p, JSON.stringify(q, null, 1) + '\n'); renameSync(p, `queue/yt/done/${f}`);
      done.push({ f, ...r }); console.log(`${f}: uploaded ${r.id} (${r.privacy})`);
    } catch (e) {
      q.lastError = hide(e.message).slice(0, 300); q.tries = (q.tries || 0) + 1;
      writeFileSync(p, JSON.stringify(q, null, 1) + '\n'); console.log(`::error::${f}: ${q.lastError}`);
    }
  }
  const extra = wide ? await followups(T) : ['playlists and captions wait for the youtube.force-ssl permission'];
  save({ ...base, lastRun: done, followups: extra });
}
main().catch(fail);
