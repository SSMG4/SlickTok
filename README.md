# SlickTok

A free, open-source, ad-free TikTok video downloader. Paste a link,
get the watermark-free file back. No account, no tracking, no ads.

Live instance: [slicktok.ssmg4.dpdns.org](https://slicktok.ssmg4.dpdns.org)

## Features

- No watermark, pulls TikTok's own clean playback file
- HD download when a higher-resolution rendition is available
- Photo/slideshow posts on a best-effort basis
- No account, no login, rate-limited by IP instead
- No ads, no analytics, no third-party scripts
- Multi-language UI (23 languages, more welcome, see
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

`ffmpeg` is also needed for the slideshow-to-video feature; most
package managers have it (`apt-get install ffmpeg` on Debian).

Visit `http://localhost:3005`.

## Documentation

Full docs live in [docs/](docs/README.md), start there to find your way
around.

## Disclaimer

SlickTok is not affiliated with, endorsed by, or connected to TikTok
or ByteDance Ltd. Only download content you own, have permission to
save, or are otherwise entitled to under applicable law. See
[TERMS.md](docs/TERMS.md).

## License

Copyright (c) 2026 [SSMG4](https://github.com/SSMG4).

Licensed under [AGPL-3.0-or-later](LICENSE). If you run a modified
version of this as a network service, the license requires you to
make your source available to its users too.
