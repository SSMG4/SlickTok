# Using SlickTok

## What it does

Paste a public TikTok video link, get back the same file TikTok's own
app plays internally — no watermark, no ads, no account.

## Supported links

Both formats TikTok itself generates are supported:

- Full desktop links:
  `https://www.tiktok.com/@username/video/7663052149374340373`
  (extra query parameters like `?is_from_webapp=1&sender_device=pc`
  are ignored automatically)
- Short mobile links:
  `https://vm.tiktok.com/ZN81KGhwJ/`

Paste either one into the box on the homepage and submit.

## What you get back

- **Video posts**: a "Download" button, and a "Download HD" button
  when TikTok served a distinct higher-resolution rendition.
- **Photo slideshows**: shown on a best-effort basis. The background
  audio track downloads reliably; the individual photos are not
  currently extracted (see [ARCHITECTURE.md](ARCHITECTURE.md) for
  why, and if you'd like to help fix that).

All downloads are watermark-free — SlickTok pulls the same clean
rendition TikTok's own app uses for in-app playback, not the
watermarked copy TikTok generates for external sharing.

## Rate limits

Because there's no login, limits are applied per IP address instead:

- **50 videos per hour**
- **1,000 videos per day**

These exist to keep a shared instance available for everyone. If
you're self-hosting, you control these values — see
[DEPLOY.md](DEPLOY.md).

## What SlickTok is not

- Not a bulk downloader — one link at a time, by design.
- Not a way to download private, deleted, or region-locked videos.
- Not affiliated with TikTok or ByteDance.

## Before you download something

Only save content you own, have permission to save, or are otherwise
entitled to download under applicable law. See
[TERMS.md](TERMS.md) for the full terms.

## Running your own instance

SlickTok is open source (AGPL-3.0-or-later). To self-host it, see
[DEPLOY.md](DEPLOY.md).
