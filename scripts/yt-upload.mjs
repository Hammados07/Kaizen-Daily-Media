// Rimi Lab Publisher: uploads our own videos to our own YouTube channel with the YouTube Data API v3.
// Uses only the youtube.upload scope (videos.insert, and thumbnails.set for explainers). It reads no other data.
// Secrets (never printed or written): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.
// Usage: node scripts/yt-upload.mjs check | test <repo path to an mp4> | publish
// Queue: queue/yt/<name>.json = {"when": "<ISO time with offset>", "file": "<repo path to the mp4>",
//   "title": "...", "description": "...", "tags": ["..."], "short": true, "thumbnail": "<optional repo path to a jpg>"}
// Uploaded entries move to queue/yt/done/ with the video id. Results are written to queue/yt/status.json.
import { readdirSync, readFileSync, writeFileSync, renameSync, statSync, mkdirSync } from 'node:fs';
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

async function upload(T, q) {
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
  if (mode === 'check') { save(base); console.log('signed in; scope:', scope); return; }
  if (mode === 'test') { // a private test upload, used for the audit evidence
    const file = process.argv[3];
    const r = await upload(T, { file, title: 'Rimi Lab Publisher test upload', description: 'Private test of our upload tool.', privacy: 'private' });
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
  save({ ...base, lastRun: done });
}
main().catch(fail);
