# Architecture

## Overview

SlickTok is a single Node.js process (Express) that serves a static
frontend and a small JSON API. There is no database, no queue, no
build step for the frontend, and no separate reverse proxy, Cloudflare
Tunnel connects directly to the Node process.

```mermaid
flowchart LR
    Browser -->|HTTPS| CF[Cloudflare edge]
    CF -->|Tunnel| CFD[cloudflared]
    CFD -->|http://localhost:3005| Express

    subgraph Server [Node process]
        Express -->|static files| Public[public/]
        Express -->|POST /api/resolve| Resolve[services/tiktok.js]
        Express -->|GET /api/download| Proxy[download proxy]
        Express -->|POST /api/download-zip| Zip[archiver]
        Express -->|POST /api/slideshow-video| Convert[services/slideshowVideo.js]
        Express -->|POST /api/_deploy| Webhook[webhook.js]
    end

    Resolve -->|spawns| YtDlp[yt-dlp]
    Resolve -->|best-effort fetch| WebApi[TikTok web API]
    YtDlp -->|resolves| TikTok[(TikTok)]
    WebApi -->|resolves| TikTok
    Proxy -->|fetch, allowlisted| TikTok
    Zip -->|fetch, allowlisted| TikTok
    Convert -->|fetch + ffmpeg| TikTok
    Webhook -->|spawns| Deploy[scripts/deploy.sh]
    Deploy -->|git pull, npm ci, pm2 reload| Server
```

## Why yt-dlp instead of a hand-written extractor

TikTok has no public API for this. Every downloader site, including
the one that inspired this project, works by either reverse-engineering
TikTok's private web/app API or by shelling out to something that
already does. `yt-dlp` maintains that extraction logic upstream, with
frequent releases specifically because TikTok changes its internals
often. Writing and maintaining an equivalent extractor from scratch
here would duplicate that work with far less test coverage and no
community maintaining it. `scripts/deploy.sh` runs `yt-dlp -U` on
every deploy, and `DEPLOY.md` sets up a daily cron job to do the same
independent of code deploys, since a `yt-dlp` release can fix TikTok
compatibility with no changes to this repository at all.

## Request flow: resolving a video

1. Client `POST /api/resolve` with `{ url }`.
2. `server/middleware/rateLimiter.js` checks the hourly and daily
   counters for the caller's IP (`CF-Connecting-IP` header when
   present, falling back to `req.ip`).
3. `server/services/tiktok.js` validates the URL's hostname ends in
   `tiktok.com`, then runs `yt-dlp -j <url>` and parses the JSON
   info-dict it returns. This is the reliable path and covers both
   full `tiktok.com/@user/video/ID` links and short `vm.tiktok.com`
   / `vt.tiktok.com` redirect links, yt-dlp resolves the redirect
   itself.
4. Formats are filtered to exclude anything yt-dlp marked
   `format_note: "watermarked"`, deduplicated by resolution, and the
   top one or two are exposed as `sd`/`hd` download URLs.
5. Separately, `fetchWebEnrichment()` makes a **best-effort** call to
   TikTok's undocumented `item_detail` web endpoint to try to get the
   author's avatar image and, for photo posts, the individual image
   URLs, neither of which `yt-dlp` exposes. If this call fails for any
   reason (blocked, rate-limited, schema changed), the function
   returns `null` and the rest of the response is unaffected, the
   avatar falls back to an initial letter, and a slideshow's images
   stay empty with an explanatory `warning`. This call is genuinely
   fragile since it depends on an unofficial endpoint; treat it as a
   bonus, not a guarantee.
6. The normalized result (title, author, stats, thumbnail, download
   URLs, images) is returned to the client, nothing is persisted.

## Request flow: downloading a file

The URLs returned by `/api/resolve` are not exposed to the browser
directly as final download links. Instead, the client requests
`GET /api/download?src=<tiktok-cdn-url>&filename=<name>`, and the
server:

1. Validates that `src`'s hostname matches a fixed allowlist of known
   TikTok/CDN domains (`server/services/tiktok.js`,
   `isAllowedCdnUrl`, this includes plain `tiktok.com` itself, since
   TikTok often serves video directly from subdomains like
   `v16-webapp-prime.tiktok.com` rather than a dedicated CDN
   hostname). Anything else is rejected before any outbound request
   is made, this is the SSRF guard mentioned in
   [SECURITY.md](SECURITY.md).
2. Fetches `src` with a browser-like `User-Agent` and a `Referer` of
   `https://www.tiktok.com/`, since TikTok's CDN checks both.
3. Streams the response body straight through to the client. By
   default this sends `Content-Disposition: attachment` to force a
   download; passing `?inline=1` (used by the in-page video preview)
   sends `Content-Disposition: inline` instead so the browser can
   play it directly in a `<video>` tag. Nothing touches disk either
   way.

Photo slideshows use the same allowlist for each image.
`/api/download-zip` streams them into a zip archive on the fly via
`archiver`, and `/api/slideshow-video` (see below) downloads them to a
temp directory for `ffmpeg` to process, neither buffers the whole set
in memory at once.

## Slideshow-to-video conversion

`server/services/slideshowVideo.js` turns a photo slideshow into an
MP4, timed to its background audio:

1. Downloads every image and the audio track into a fresh temp
   directory (`fs.mkdtemp`).
2. Runs `ffprobe` on the audio to get its duration, then divides that
   evenly across the images to get a per-image display time.
3. Builds an `ffmpeg concat` demuxer script (hard cuts between
   images, no crossfade, simple and predictable) and runs a single
   `ffmpeg` pass that scales/pads everything to a 1080x1920 portrait
   canvas, encodes H.264 + AAC, and muxes in the audio.
4. Streams the resulting file back and deletes the temp directory
   once the response finishes.

This only works when both images and an audio track were available
from the resolve step, so it inherits the same best-effort limitation
as image extraction above. It's also rate-limited separately
(`conversionLimiter` in `server/middleware/rateLimiter.js`) since
it's meaningfully more CPU-intensive than a plain download.

## Auto-deploy

`server/routes/webhook.js` is mounted before the JSON body parser
specifically so it can read the raw request body, GitHub's
`X-Hub-Signature-256` HMAC is computed over the exact bytes sent, and
re-serializing parsed JSON would break the signature check. On a
verified push to the configured branch, it spawns
`scripts/deploy.sh` as a detached process and responds immediately;
the script pulls, reinstalls dependencies, updates `yt-dlp`, and
reloads the PM2 process. See [DEPLOY.md](DEPLOY.md) for the full
setup.

## Known limitations

- **Avatar and slideshow images are best-effort.** Both depend on an
  undocumented TikTok web endpoint that isn't guaranteed to keep
  working (see step 5 above). When it fails, the UI degrades
  gracefully rather than breaking.
- **yt-dlp's info-dict shape is a moving target.** The field mapping
  in `server/services/tiktok.js` was written against yt-dlp
  `2026.07.04`. If TikTok changes its API, a newer yt-dlp release
  will usually keep working without any changes here, but if
  downloads start failing, run `yt-dlp -j <url>` directly on the
  server to see the current shape before assuming this repo's code is
  the problem.
- **Single process, in-memory rate limiting.** Fine for one server.
  If you ever run multiple instances behind a load balancer, the
  rate limiter would need a shared store (e.g., Redis via
  `rate-limit-redis`) instead of `express-rate-limit`'s default
  in-memory store.
- **No audio extraction for ordinary videos.** Only slideshow posts
  expose a separate audio-only stream from yt-dlp; a regular video's
  audio is muxed into the video file. A standalone MP3 for ordinary
  videos would need `ffmpeg` to extract it server-side, not
  implemented for plain videos (only for the slideshow converter
  above, which already shells out to `ffmpeg` for a different
  reason).
- **Slideshow-to-video is hard cuts only.** No crossfade or
  Ken-Burns-style pan/zoom between images. Doable later with a more
  elaborate `ffmpeg` filter graph, kept simple for now.
