# Privacy Policy

SlickTok is built to need as little data about you as possible. This
page describes the hosted instance's default behavior; if you're
running your own copy, it applies to your instance too unless you've
changed the code.

## No accounts

There is no sign-up, login, or user profile anywhere on this site.
Nothing you enter is tied to an identity beyond your IP address, and
only for the purpose described below.

## What is processed, and why

- **The TikTok link you paste** is sent to the server to be resolved
  (via `yt-dlp`) and is not stored. It exists in server memory only
  for the duration of that one request.
- **Your IP address** is used to enforce the hourly/daily rate limits
  (see [USAGE.md](USAGE.md)) and is held in memory by the rate
  limiter until its time window expires. It is not written to disk
  and not linked to anything you download.
- **Video/image bytes** are streamed from TikTok's CDN through the
  server straight to your browser. They are never saved to disk on
  the server.

## What is not collected

- No analytics, no tracking pixels, no third-party scripts
- No advertising, and therefore no ad-tech data sharing
- No cookies. The only thing stored in your browser is your language
  choice, saved locally via `localStorage`, it never leaves your
  device.

## Third parties involved

To do its job, SlickTok's server necessarily talks to TikTok's own
infrastructure (to resolve a link and to fetch the underlying video or
image files). Your browser never talks to TikTok directly, TikTok
sees the server's IP address, not yours.

## Logs

The application does not log the URLs you submit or the videos you
download. Whoever operates a given instance may still have
process-level logs (for example, PM2's stdout/stderr logs, or the
`logs/deploy.log` file used for auto-deploys), those contain
operational output, not visitor activity, by default.

## Children's privacy

This service is not directed at children and does not knowingly
collect data from anyone. It also does not perform age verification;
downloading content is the responsibility of the person using the
tool, per the [Terms](TERMS.md).

## Changes to this policy

This document may be updated as the project changes. Material changes
will be reflected in the commit history of this file.

## Contact

Open an issue on the project's GitHub repository for privacy
questions.

---

*This is a plain-language description of how the software behaves,
written by the project maintainer, it isn't legal advice, and
self-hosters distributing this software to others should review it
against their own jurisdiction's requirements.*
