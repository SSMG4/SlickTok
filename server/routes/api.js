import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import {
  resolveTikTok, isAllowedCdnUrl, isSupportedTikTokUrl, getFormatIdForQuality, ResolveError,
} from '../services/tiktok.js';
import { buildSlideshowVideo } from '../services/slideshowVideo.js';
import { hourlyLimiter, dailyLimiter, conversionLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

const router = Router();

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Referer: 'https://www.tiktok.com/',
};

const QUALITIES = new Set(['sd', 'hd', 'audio']);

router.get('/health', (req, res) => {
  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
  } catch {
    // leave as 'unknown', e.g. if this isn't a git checkout
  }
  res.json({ ok: true, commit });
});

router.post('/resolve', hourlyLimiter, dailyLimiter, async (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'Paste a TikTok link first.' });
    return;
  }

  try {
    const result = await resolveTikTok(url.trim());
    res.json(result);
  } catch (err) {
    if (err instanceof ResolveError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Something went wrong resolving that link.' });
  }
});

router.get('/download', async (req, res) => {
  const { url, quality } = req.query;
  if (typeof url !== 'string' || !isSupportedTikTokUrl(url)) {
    res.status(400).json({ error: 'Invalid video link.' });
    return;
  }
  if (typeof quality !== 'string' || !QUALITIES.has(quality)) {
    res.status(400).json({ error: 'Invalid quality.' });
    return;
  }

  const safeName = (typeof req.query.filename === 'string' && req.query.filename.replace(/[^\w.-]/g, '')) || '';
  const extension = quality === 'audio' ? 'm4a' : 'mp4';
  const filename = safeName || `slicktok-video.${extension}`;

  let formatId;
  try {
    formatId = await getFormatIdForQuality(url, quality);
  } catch (err) {
    const status = err instanceof ResolveError ? err.status : 502;
    res.status(status).json({ error: err.message || 'Could not prepare that download.' });
    return;
  }

  const disposition = req.query.inline === '1' ? 'inline' : `attachment; filename="${filename}"`;
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('Content-Type', quality === 'audio' ? 'audio/mp4' : 'video/mp4');

  const child = spawn(config.ytdlpPath, [url, '-f', formatId, '-o', '-', '--no-warnings', '--quiet'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  child.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'Download failed to start.' });
  });
  child.on('close', (code) => {
    if (code !== 0 && !res.headersSent) {
      console.error(`[download] yt-dlp exited ${code}: ${stderr.slice(-500)}`);
      res.status(502).json({ error: 'Download failed. Paste the video link again.' });
    }
  });

  req.on('close', () => {
    if (!child.killed) child.kill();
  });

  child.stdout.pipe(res);
});

router.post('/download-zip', async (req, res) => {
  const { images } = req.body || {};
  if (!Array.isArray(images) || images.length === 0 || images.length > 60) {
    res.status(400).json({ error: 'No valid images to package.' });
    return;
  }
  if (!images.every((src) => typeof src === 'string' && isAllowedCdnUrl(src))) {
    res.status(400).json({ error: 'Invalid image link.' });
    return;
  }

  res.setHeader('Content-Disposition', 'attachment; filename="slicktok-slideshow.zip"');
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', () => res.end());
  archive.pipe(res);

  for (let i = 0; i < images.length; i += 1) {
    try {
      const upstream = await fetch(images[i], { headers: UPSTREAM_HEADERS });
      if (upstream.ok && upstream.body) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        archive.append(buffer, { name: `image-${String(i + 1).padStart(2, '0')}.jpg` });
      }
    } catch {
      // Skip a single failed image rather than aborting the whole archive.
    }
  }

  await archive.finalize();
});

router.post('/slideshow-video', conversionLimiter, async (req, res) => {
  const { images, sourceUrl } = req.body || {};
  if (!Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: 'No images to convert.' });
    return;
  }
  if (typeof sourceUrl !== 'string' || !isSupportedTikTokUrl(sourceUrl)) {
    res.status(400).json({ error: 'Missing or invalid source link.' });
    return;
  }

  let result;
  try {
    result = await buildSlideshowVideo(images, sourceUrl);
  } catch {
    res.status(502).json({ error: 'Could not build a video from this slideshow.' });
    return;
  }

  try {
    const { size } = await stat(result.path);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', 'attachment; filename="slicktok-slideshow.mp4"');
    const stream = createReadStream(result.path);
    stream.pipe(res);
    stream.on('close', result.cleanup);
    stream.on('error', result.cleanup);
  } catch {
    await result.cleanup();
    res.status(500).json({ error: 'Could not read the converted video.' });
  }
});

export default router;
