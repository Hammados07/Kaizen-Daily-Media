// Adds the 4-second "Like and subscribe" end card to a video for YouTube.
// Portrait videos get assets/endcard-portrait.png, landscape ones assets/endcard-landscape.png.
// The video's own sound fades out at the cut and a soft chime (assets/endcard.wav, made in code) plays under the card. The original file is not changed.
// Usage: node scripts/endcard.mjs <in.mp4> <out.mp4>   (needs ffmpeg and ffprobe)
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CARD_SECONDS = 4;
const here = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

export function addEndcard(input, output) {
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', input]).toString());
  const v = info.streams.find((s) => s.codec_type === 'video');
  const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
  const W = v.width, H = v.height, D = Number(info.format.duration);
  const [n, d] = String(v.avg_frame_rate || v.r_frame_rate || '30/1').split('/').map(Number);
  const fps = d ? Math.round((n / d) * 100) / 100 : 30;
  const card = here(W >= H ? 'assets/endcard-landscape.png' : 'assets/endcard-portrait.png');
  const audioIn = hasAudio ? '[0:a]' : '[3:a]';
  const args = ['-y', '-v', 'error', '-i', input, '-loop', '1', '-framerate', String(fps), '-t', String(CARD_SECONDS), '-i', card, '-i', here('assets/endcard.wav')];
  if (!hasAudio) args.push('-f', 'lavfi', '-t', String(D), '-i', 'anullsrc=r=48000:cl=stereo');
  args.push('-filter_complex',
    `[1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08121a,setsar=1,format=yuv420p,fps=${fps}[c];` +
    `[0:v]setsar=1,format=yuv420p,fps=${fps}[v];[v][c]concat=n=2:v=1:a=0[vo];` +
    `${audioIn}aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${D.toFixed(3)},afade=t=out:st=${Math.max(0, D - 0.4).toFixed(3)}:d=0.4[a0];` +
    `[2:a]aresample=48000,aformat=channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1[ao]`,
    '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', output);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  return { width: W, height: H, seconds: Math.round((D + CARD_SECONDS) * 10) / 10 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(addEndcard(process.argv[2], process.argv[3]));
}
