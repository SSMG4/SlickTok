# SlickTok

A free, open-source, ad-free TikTok video downloader. Paste a link,
get the watermark-free file back. No account, no tracking, no ads.

Live instance: [slicktok.ssmg4.dpdns.org](https://slicktok.ssmg4.dpdns.org)

## Features

- No watermark — pulls TikTok's own clean playback file
- HD download when a higher-resolution rendition is available
- Photo/slideshow posts on a best-effort basis
- No account, no login — rate-limited by IP instead
- No ads, no analytics, no third-party scripts
- Multi-language UI (8 languages, more welcome — see
  [CONTRIBUTING.md](docs/CONTRIBUTING.md))
- Fully open source, AGPL-3.0-or-later

## Supported links

```
https://www.tiktok.com/@user/video/7663052149374340373?is_from_webapp=1
https://vm.tiktok.com/ZN81KGhwJ/
```

## Quick start (local)

```bash
git clone https://github.com/SSMG4/slicktok.git
cd slicktok
npm install
pip install --break-system-packages -U yt-dlp
cp .env.example .env
npm run dev
```

Visit `http://localhost:3000`.

## Documentation

| Doc | What's in it |
|---|---|
| [USAGE.md](docs/USAGE.md) | How to use SlickTok, rate limits, supported links |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works internally, known limitations |
| [DEPLOY.md](docs/DEPLOY.md) | Full self-hosting guide (Debian, PM2, Cloudflare Tunnel, auto-deploy) |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Local setup, project goals, how to add a language |
| [SECURITY.md](docs/SECURITY.md) | Reporting a vulnerability |
| [PRIVACY.md](docs/PRIVACY.md) | What data is (and isn't) processed |
| [TERMS.md](docs/TERMS.md) | Terms of service, acceptable use |
| [CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md) | Community expectations |

## Disclaimer

SlickTok is not affiliated with, endorsed by, or connected to TikTok
or ByteDance Ltd. Only download content you own, have permission to
save, or are otherwise entitled to under applicable law — see
[TERMS.md](docs/TERMS.md).

## License

Copyright (c) 2026 Cake ([SSMG4](https://github.com/SSMG4)).

Licensed under [AGPL-3.0-or-later](LICENSE). If you run a modified
version of this as a network service, the license requires you to
make your source available to its users too.
