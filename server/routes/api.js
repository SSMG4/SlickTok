import { Router } from 'express';
import { Readable } from 'node:stream';
import archiver from 'archiver';
import { resolveTikTok, isAllowedCdnUrl, ResolveError } from '../services/tiktok.js';
import { hourlyLimiter, dailyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Referer: 'https://www.tiktok.com/',
};

router.get('/health', (req, res) => {
  res.json({ ok: true });
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
  const src = req.query.src;
  if (typeof src !== 'string' || !isAllowedCdnUrl(src)) {
    res.status(400).json({ error: 'Invalid or expired download link.' });
    return;
  }

  const safeName = (typeof req.query.filename === 'string' && req.query.filename.replace(/[^\w.-]/g, '')) || '';
  const filename = safeName || 'slicktok-video.mp4';

  try {
    const upstream = await fetch(src, { headers: UPSTREAM_HEADERS });
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: 'That link is no longer available. Paste the video link again.' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    const length = upstream.headers.get('content-length');
    if (length) res.setHeader('Content-Length', length);

    Readable.fromWeb(upstream.body).pipe(res);
  } catch {
    res.status(502).json({ error: 'Download failed. Paste the video link again.' });
  }
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

export default router;
