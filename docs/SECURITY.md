# Security Policy

## Supported versions

SlickTok is a single rolling branch (`master`). There are no maintained
release branches, the latest commit on `master` is the supported version.
If you're self-hosting, keep your deployment up to date with `master`.

## Reporting a vulnerability

Please do not open a public GitHub issue for security reports.

Instead, use GitHub's private reporting:
**Repository → Security → Report a vulnerability**.

If that isn't available, open a regular issue asking for a private
contact channel, don't include exploit details in it.

Include, where possible:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- The version/commit you tested against

Expect an initial response within a few days. This is a personal
open-source project maintained outside of working hours, not a
company with an SLA, thank you for your patience.

## Scope

Things that are explicitly in scope:

- The Express server under `server/`
- The download proxy and its CDN allowlist (`server/services/tiktok.js`)
- The GitHub webhook auto-deploy endpoint (`server/routes/webhook.js`)
- The frontend under `public/`

Things that are explicitly out of scope:

- TikTok's own platform, apps, or infrastructure
- Vulnerabilities in `yt-dlp` itself (report those to the
  [yt-dlp project](https://github.com/yt-dlp/yt-dlp) directly)
- Denial of service via raw traffic volume, that's what the rate
  limiter and Cloudflare are for, not something a report is needed for

## Existing safeguards worth knowing about

If you're auditing this project or self-hosting it, these are the
mitigations already in place:

- **Download proxy SSRF allowlist**: `/api/download` and
  `/api/download-zip` only ever fetch URLs whose hostname matches a
  fixed list of known TikTok CDN domains. Arbitrary URLs are rejected
  before any outbound request is made.
- **Webhook signature verification**: the `/api/_deploy` route
  verifies GitHub's `X-Hub-Signature-256` HMAC using a constant-time
  comparison before running anything, and refuses to run at all if no
  secret is configured.
- **Rate limiting**: per-IP hourly and daily limits on `/api/resolve`,
  keyed off `CF-Connecting-IP` when present.
- **No stored content**: video/image bytes are streamed through the
  server, never written to disk.

If you find a way around any of the above, that's exactly the kind of
report this policy wants.
