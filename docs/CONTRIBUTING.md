# Contributing to SlickTok

Thanks for considering it. This is a small, personal open-source
project, keep pull requests focused and this should be painless.

## Project goals (please read before opening a PR)

SlickTok exists to be:

- **Free**, no paywalls, no premium tier.
- **Ad-free**, no ad slots, no "watch an ad to unlock HD."
- **Account-free**, no login, no user profiles.
- **Untracked**, no analytics, no third-party scripts.

Contributions that work against any of the above will be declined
regardless of how well they're written. If you want to build a
version with ads or accounts, fork it, that's what the license is
for.

## Local setup

```bash
git clone https://github.com/SSMG4/slicktok.git
cd slicktok
npm install
cp .env.example .env
```

You'll also need `yt-dlp` on your `PATH` (or set `YTDLP_PATH` in
`.env`), and `ffmpeg` for the slideshow-to-video feature:

```bash
pip install --user -U yt-dlp
```

(`apt-get install ffmpeg`, `brew install ffmpeg`, or whatever your
package manager uses.)

Run it:

```bash
npm run dev
```

This starts the server with `node --watch`, restarting on file
changes. Visit `http://localhost:3005`.

## Before opening a pull request

```bash
npm run lint
```

CI runs this on every push and pull request; PRs with lint errors
won't be merged until they're fixed.

Keep commits focused, one logical change per commit, with a short
title and, if the "why" isn't obvious from the diff, a brief body
explaining it.

## Adding a language

1. Add `public/i18n/<code>.json`, using `public/i18n/en.json` as the
   key reference, every key in `en.json` should exist in your file.
2. Add an entry to the `LANGS` array in `public/js/app.js` (code,
   display label, and a `flag` key).
3. Add a matching entry to the `FLAGS` object in the same file, a
   small flat SVG in a `0 0 24 16` viewBox, consistent with the
   existing ones (plain color bands, no gradients or photographic
   flags).
4. Translations should be your own original wording, please don't
   machine-translate SnapTik, Musicaldown, or any other existing
   downloader site's copy.

## Reporting bugs

Open an issue with:

- The TikTok link format you used (a placeholder is fine if the
  actual link is sensitive)
- What you expected vs. what happened
- Server logs if you're self-hosting and can share them

## Reporting a security issue

Don't open a public issue, see [SECURITY.md](SECURITY.md).

## Architecture

If you want to understand how a piece fits together before changing
it, see [ARCHITECTURE.md](ARCHITECTURE.md).
