import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';

const execFileAsync = promisify(execFile);

const TIKTOK_HOST_RE = /(^|\.)tiktok\.com$/i;

const CDN_HOST_SUFFIXES = [
  'tiktok.com',
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

// Shared by resolveTikTok (to report what's available) and getFormatId
// (to re-derive the same pick freshly at download time, see below on why
// downloads are re-resolved rather than reusing the URL from resolve).
export function classifyFormats(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const audioOnly = formats.find((f) => f.vcodec === 'none') || null;
  const isSlideshow = formats.length > 0 && formats.every((f) => f.vcodec === 'none') && !!audioOnly;

  const withVideo = formats.filter((f) => f.vcodec && f.vcodec !== 'none');
  const noWatermark = withVideo.filter((f) => f.format_note !== 'watermarked');
  const candidates = noWatermark.length ? noWatermark : withVideo;

  // TikTok sometimes exposes a higher-resolution video-only stream
  // alongside the normal combined (video+audio) file. Ranking by height
  // alone can pick that video-only stream over the combined one, which
  // downloads fine but plays back with no sound. Prefer formats that
  // already carry audio; only fall back to a video-only pick (merged with
  // the best available audio track via ffmpeg) if nothing combined exists.
  const combined = candidates.filter((f) => f.acodec && f.acodec !== 'none');
  const usable = combined.length ? combined : candidates;
  const needsAudioMerge = combined.length === 0 && candidates.length > 0;

  const ranked = dedupeByHeight(usable);

  return { isSlideshow, audioOnly, ranked, needsAudioMerge };
}

function formatIdForQuality(classified, quality) {
  const { isSlideshow, audioOnly, ranked, needsAudioMerge } = classified;
  if (quality === 'audio') return audioOnly?.format_id || null;
  if (isSlideshow || !ranked.length) return null;
  const picked = quality === 'hd' ? ranked[0] : (ranked[1] || ranked[0]);
  if (!picked) return null;
  return needsAudioMerge ? `${picked.format_id}+bestaudio` : picked.format_id;
}

function pickThumbnail(info) {
  const thumbs = Array.isArray(info.thumbnails) ? info.thumbnails : [];
  if (!thumbs.length) return null;
  return [...thumbs].sort((a, b) => (b.preference ?? -1) - (a.preference ?? -1))[0]?.url || null;
}

const ENRICHMENT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Referer: 'https://www.tiktok.com/',
};

// Best-effort only: TikTok's web item_detail endpoint is undocumented and
// unofficial. If it changes shape, rate-limits us, or is unreachable, we
// simply fall back to what yt-dlp already gave us (no avatar, no slideshow
// images) rather than failing the whole request. See ARCHITECTURE.md.
async function fetchWebEnrichment(id) {
  if (!id) return null;
  try {
    const res = await fetch(`https://www.tiktok.com/api/item_detail/?itemId=${encodeURIComponent(id)}`, {
      headers: ENRICHMENT_HEADERS,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.itemInfo?.itemStruct;
    if (!item) return null;

    const avatar = item.author?.avatarThumb?.urlList?.[0]
      || item.author?.avatarMedium?.urlList?.[0]
      || null;

    const images = Array.isArray(item.imagePost?.images)
      ? item.imagePost.images
        .map((img) => img?.imageURL?.urlList?.[0])
        .filter((url) => typeof url === 'string' && isAllowedCdnUrl(url))
      : null;

    return { avatar, images: images && images.length ? images : null };
  } catch {
    return null;
  }
}

async function runYtDlpJson(rawUrl) {
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
  try {
    return JSON.parse(stdout);
  } catch {
    throw new ResolveError('Unexpected response while reading that video.', 502);
  }
}

// Downloading re-resolves from scratch by default (see getFormatIdForQuality
// below), which costs a few seconds. To keep the common case, click download
// right after resolving, fast, the classification from resolve is cached
// briefly and reused if the download request lands within the window.
// Anything older re-resolves for real, since the CDN URLs yt-dlp gets back
// are short-lived and a stale pick would just fail anyway.
const FORMAT_CACHE_TTL_MS = 3 * 60 * 1000;
const FORMAT_CACHE_MAX_ENTRIES = 200;
const formatCache = new Map();

function cacheClassified(rawUrl, classified) {
  if (formatCache.size >= FORMAT_CACHE_MAX_ENTRIES) {
    formatCache.delete(formatCache.keys().next().value);
  }
  formatCache.set(rawUrl, { classified, expires: Date.now() + FORMAT_CACHE_TTL_MS });
}

function getCachedClassified(rawUrl) {
  const entry = formatCache.get(rawUrl);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    formatCache.delete(rawUrl);
    return null;
  }
  return entry.classified;
}

export async function resolveTikTok(rawUrl) {
  if (!isSupportedTikTokUrl(rawUrl)) {
    throw new ResolveError('That does not look like a TikTok link.', 400);
  }

  const info = await runYtDlpJson(rawUrl);
  const classified = classifyFormats(info);
  const { isSlideshow, audioOnly, ranked } = classified;
  cacheClassified(rawUrl, classified);

  const downloads = {};
  if (!isSlideshow) {
    if (ranked.length === 1) downloads.sd = true;
    else if (ranked.length > 1) {
      downloads.hd = true;
      downloads.sd = true;
    }
  }
  if (audioOnly) downloads.audio = true;

  const enrichment = await fetchWebEnrichment(info.id);

  return {
    id: String(info.id || ''),
    sourceUrl: rawUrl,
    type: isSlideshow ? 'slideshow' : 'video',
    title: info.description || info.title || '',
    author: {
      username: info.uploader || '',
      nickname: info.channel || info.uploader || '',
      avatar: enrichment?.avatar || null,
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
    images: isSlideshow ? (enrichment?.images || null) : null,
    warning: isSlideshow && !enrichment?.images
      ? 'This looks like a photo slideshow. Only the background audio could be extracted; image extraction did not succeed for this post.'
      : null,
  };
}

// Downloads are re-resolved from scratch here rather than reusing the URL
// yt-dlp handed back at resolve time, on purpose: TikTok's CDN links are
// short-lived signed URLs, and fetching them ourselves with hand-picked
// headers has proven unreliable (TikTok's CDN is choosier than its metadata
// API about what it'll serve to). Letting yt-dlp itself do the actual
// download reuses the same logic that already works for resolving, instead
// of a second, weaker reimplementation of it.
export async function getFormatIdForQuality(rawUrl, quality) {
  if (!isSupportedTikTokUrl(rawUrl)) {
    throw new ResolveError('That does not look like a TikTok link.', 400);
  }
  let classified = getCachedClassified(rawUrl);
  if (!classified) {
    const info = await runYtDlpJson(rawUrl);
    classified = classifyFormats(info);
    cacheClassified(rawUrl, classified);
  }
  const formatId = formatIdForQuality(classified, quality);
  if (!formatId) {
    throw new ResolveError('That quality is not available for this video anymore.', 404);
  }
  return formatId;
}
