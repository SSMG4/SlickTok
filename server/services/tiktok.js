import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';

const execFileAsync = promisify(execFile);

const TIKTOK_HOST_RE = /(^|\.)tiktok\.com$/i;

const CDN_HOST_SUFFIXES = [
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokcdn-eu.com',
  'tiktokv.com',
  'tiktokv.eu',
  'muscdn.com',
  'ibyteimg.com',
  'ibytedtos.com',
];

export class ResolveError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export function isSupportedTikTokUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  return TIKTOK_HOST_RE.test(parsed.hostname);
}

export function isAllowedCdnUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return CDN_HOST_SUFFIXES.some(
    (suffix) => parsed.hostname === suffix || parsed.hostname.endsWith(`.${suffix}`),
  );
}

function dedupeByHeight(formats) {
  const byHeight = new Map();
  for (const format of formats) {
    const key = format.height || 0;
    const current = byHeight.get(key);
    if (!current || (format.tbr || 0) > (current.tbr || 0)) {
      byHeight.set(key, format);
    }
  }
  return [...byHeight.values()].sort((a, b) => (b.height || 0) - (a.height || 0));
}

function pickDownloads(formats) {
  const withVideo = formats.filter((f) => f.vcodec && f.vcodec !== 'none');
  const noWatermark = withVideo.filter((f) => f.format_note !== 'watermarked');
  const ranked = dedupeByHeight(noWatermark.length ? noWatermark : withVideo);

  const downloads = {};
  if (ranked.length === 1) {
    downloads.sd = ranked[0].url;
  } else if (ranked.length > 1) {
    downloads.hd = ranked[0].url;
    downloads.sd = ranked[1].url;
  }
  return downloads;
}

function pickThumbnail(info) {
  const thumbs = Array.isArray(info.thumbnails) ? info.thumbnails : [];
  if (!thumbs.length) return null;
  return [...thumbs].sort((a, b) => (b.preference ?? -1) - (a.preference ?? -1))[0]?.url || null;
}

export async function resolveTikTok(rawUrl) {
  if (!isSupportedTikTokUrl(rawUrl)) {
    throw new ResolveError('That does not look like a TikTok link.', 400);
  }

  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      config.ytdlpPath,
      ['-j', '--no-warnings', '--no-playlist', rawUrl],
      { timeout: 20_000, maxBuffer: 20 * 1024 * 1024 },
    ));
  } catch {
    throw new ResolveError('Could not read that video. It may be private, deleted, or region-locked.', 502);
  }

  let info;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new ResolveError('Unexpected response while reading that video.', 502);
  }

  const formats = Array.isArray(info.formats) ? info.formats : [];
  const audioOnly = formats.find((f) => f.vcodec === 'none');
  const isSlideshow = formats.every((f) => f.vcodec === 'none') && !!audioOnly;

  const downloads = isSlideshow ? {} : pickDownloads(formats);
  if (audioOnly) downloads.audio = audioOnly.url;

  return {
    id: String(info.id || ''),
    type: isSlideshow ? 'slideshow' : 'video',
    title: info.description || info.title || '',
    author: {
      username: info.uploader || '',
      nickname: info.channel || info.uploader || '',
    },
    stats: {
      views: info.view_count ?? null,
      likes: info.like_count ?? null,
      comments: info.comment_count ?? null,
      shares: info.repost_count ?? null,
    },
    thumbnail: pickThumbnail(info),
    duration: info.duration ?? null,
    downloads,
    images: null,
    warning: isSlideshow
      ? 'This looks like a photo slideshow. Only the background audio could be extracted — image extraction is not implemented yet.'
      : null,
  };
}
