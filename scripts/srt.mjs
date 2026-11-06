// Turns an explainer's narration timeline (rimilab/video/epNN/timeline.js, written by the video kit) into captions.srt.
// The times are the real narration times, so the captions match the voice exactly.
// Usage: node scripts/srt.mjs <timeline.js> > long/epNN/captions.srt
import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const tl = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
const stamp = (t) => {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
// Long lines are split at a comma or a space so no caption is more than about 42 characters a line, two lines.
const wrap = (text) => {
  if (text.length <= 42) return text;
  const mid = Math.floor(text.length / 2);
  let cut = -1;
  for (let d = 0; d < mid; d++) { for (const i of [mid - d, mid + d]) if (text[i] === ' ') { cut = i; break; } if (cut >= 0) break; }
  return cut < 0 ? text : `${text.slice(0, cut)}\n${text.slice(cut + 1)}`;
};
let n = 0, out = '';
for (const scene of tl.timeline) for (const s of scene.subs || []) out += `${++n}\n${stamp(s.t0)} --> ${stamp(s.t1)}\n${wrap(s.text)}\n\n`;
process.stdout.write(out);
