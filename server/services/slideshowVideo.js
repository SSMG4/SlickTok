import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isAllowedCdnUrl } from './tiktok.js';

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Referer: 'https://www.tiktok.com/',
};

const MAX_IMAGES = 60;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

async function probeDurationSeconds(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffprobe failed'));
      const value = parseFloat(out.trim());
      resolve(Number.isFinite(value) && value > 0 ? value : null);
    });
  });
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { headers: UPSTREAM_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);
}

/**
 * Assembles a TikTok photo slideshow into an MP4: each image is shown for an
 * equal slice of the audio track's duration, then muxed together. Hard cuts,
 * no crossfade, simple and robust rather than clever. Returns the path to
 * the finished file and a cleanup() to remove the whole working directory;
 * callers must call cleanup() once they're done streaming the result.
 */
export async function buildSlideshowVideo(images, audioUrl) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No images provided');
  }
  if (images.length > MAX_IMAGES) {
    throw new Error('Too many images');
  }
  if (!images.every((url) => typeof url === 'string' && isAllowedCdnUrl(url))) {
    throw new Error('Invalid image URL');
  }
  if (typeof audioUrl !== 'string' || !isAllowedCdnUrl(audioUrl)) {
    throw new Error('Invalid audio URL');
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'slicktok-'));

  try {
    const imagePaths = [];
    for (let i = 0; i < images.length; i += 1) {
      const imgPath = path.join(dir, `img-${String(i).padStart(3, '0')}.jpg`);
      await downloadTo(images[i], imgPath);
      imagePaths.push(imgPath);
    }

    const audioPath = path.join(dir, 'audio.m4a');
    await downloadTo(audioUrl, audioPath);

    const audioDuration = (await probeDurationSeconds(audioPath)) || images.length * 3;
    const perImageSeconds = Math.max(1, audioDuration / images.length);

    const concatLines = imagePaths.map((p) => `file '${p}'\nduration ${perImageSeconds.toFixed(3)}`);
    // The concat demuxer drops the final image's duration unless it's
    // listed again without one - a well-known quirk, not a typo.
    concatLines.push(`file '${imagePaths[imagePaths.length - 1]}'`);
    const concatPath = path.join(dir, 'concat.txt');
    await writeFile(concatPath, concatLines.join('\n'));

    const outPath = path.join(dir, 'out.mp4');
    await run('ffmpeg', [
      '-y',
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-i', audioPath,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      '-c:v', 'libx264', '-r', '30', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      outPath,
    ]);

    return {
      path: outPath,
      cleanup: () => rm(dir, { recursive: true, force: true }).catch(() => {}),
    };
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
