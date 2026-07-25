# Deploying SlickTok

This guide walks through deploying SlickTok on a Debian server, exposed
through a Cloudflare Tunnel (no open inbound ports, no Nginx), running
under PM2, with GitHub-webhook auto-deploy on every push to `master`.

It assumes:

- A Debian server you can reach over SSH (e.g. via PuTTY).
- Node.js and PM2 already installed and on `PATH`.
- A domain added to your Cloudflare account, where you can create a
  new subdomain (this guide uses `slicktok.example.com`, replace it
  with your own throughout).
- A GitHub account, and this repository pushed somewhere under it.

Commands below are meant to be run over your SSH session. If you're
using PuTTY, paste with a right-click (or Shift+Insert), multi-line
blocks paste and run fine as-is.

---

## 1. Get the code onto the server

Pick a location for it, this guide uses `~/slicktok`.

```bash
cd ~
git clone https://github.com/SSMG4/slicktok.git
cd slicktok
```

If the repository is private, you'll need a deploy key or a personal
access token; a public repo (recommended for an open-source project
like this one) avoids that entirely.

## 2. Install yt-dlp and ffmpeg

SlickTok shells out to `yt-dlp` to resolve TikTok links, and to
`ffmpeg` for the slideshow-to-video conversion feature. Debian's
packaged Python is fine for this:

```bash
sudo apt-get update
sudo apt-get install -y python3-pip ffmpeg
pip install --break-system-packages -U yt-dlp
yt-dlp --version
ffmpeg -version
```

If `yt-dlp` isn't on `PATH` after this, find it with
`python3 -m pip show -f yt-dlp` and point `YTDLP_PATH` in `.env` (next
step) at the full path instead.

## 3. Configure the environment

```bash
cp .env.example .env
nano .env
```

Fill in:

- `PORT`, leave as `3005` unless it conflicts with something else
  already running on the server.
- `PUBLIC_URL`, `https://slicktok.example.com`
- `DEPLOY_WEBHOOK_SECRET`, generate one and keep it handy, you'll
  paste the same value into GitHub in step 7:
  ```bash
  openssl rand -hex 32
  ```
- `DEPLOY_BRANCH`, leave as `master` unless you deploy from elsewhere.
- Rate limits, the defaults (50/hour, 1000/day per IP) are already
  set; change them here if you want different numbers.

## 4. Install dependencies and do a manual sanity check

```bash
npm ci --omit=dev
node server/index.js
```

You should see `SlickTok listening on http://localhost:3005`. In a
second terminal (or another SSH session):

```bash
curl http://localhost:3005/api/health
```

You should get `{"ok":true}`. Stop the manual run with `Ctrl+C` once
that checks out, PM2 will own the process from here on.

## 5. Run it under PM2

```bash
chmod +x scripts/deploy.sh
pm2 start ecosystem.config.cjs
pm2 save
```

If PM2 isn't already set to start on boot on this server:

```bash
pm2 startup
```

...and run the `sudo env PATH=... pm2 startup ...` command it prints
out (this varies per system, which is why PM2 generates it for you).

Check it's up:

```bash
pm2 status
curl http://localhost:3005/api/health
```

## 6. Expose it with a Cloudflare Tunnel

No Nginx, no open inbound ports, `cloudflared` runs on the server and
makes an outbound-only connection to Cloudflare's edge.

### 6.1 Install cloudflared

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared
```

`any` works across Debian releases (including Debian 13), so you don't
need to match a specific codename.

### 6.2 Create the tunnel in the dashboard

1. Go to **dash.cloudflare.com** → select your domain's account →
   **Networking → Tunnels**.
2. **Create a tunnel** → connector type **Cloudflared** → name it
   `slicktok` → **Save tunnel**.
3. Under **Install and run a connector**, pick the Debian/Linux option
   and copy the command it shows you, it looks like:
   ```bash
   sudo cloudflared service install eyJhIjoiNWFiN...
   ```
   Run that exact command (with your own token) on the server. This
   installs and starts `cloudflared` as a systemd service, already
   pointed at this tunnel.
4. Back in the dashboard, the tunnel should flip to **Healthy** within
   a few seconds. Select **Next**.

### 6.3 Route your hostname to the app

Still on the tunnel's page in the dashboard, under **Routes** →
**Add a route** → **Published application**:

- **Subdomain**: `slicktok`
- **Domain**: your domain (the same zone `psmrc.ssmg4.dpdns.org`
  already lives on, if you're reusing that setup)
- **Service Type**: `HTTP`
- **URL**: `localhost:3005`

Save. Cloudflare creates the DNS record for you, there's nothing to
add manually in the DNS tab.

### 6.4 Verify

```bash
curl https://slicktok.example.com/api/health
```

From your own machine (not the server), this should return
`{"ok":true}` over HTTPS.

## 7. Set up the GitHub webhook

1. On GitHub: your repo → **Settings → Webhooks → Add webhook**.
2. **Payload URL**: `https://slicktok.example.com/api/_deploy`
3. **Content type**: `application/json`
4. **Secret**: the same value you put in `DEPLOY_WEBHOOK_SECRET` in
   `.env`.
5. **Which events**: "Just the push event."
6. **Add webhook**.

GitHub will immediately send a test ping. Since a `ping` event has no
`ref` field, SlickTok's webhook handler treats it as a no-op 200 rather
than an error, check **Recent Deliveries** on the webhook's page in
GitHub for a `200`/`202` response.

### Test it for real

```bash
git commit --allow-empty -m "test: trigger auto-deploy"
git push origin master
```

Watch the deploy log on the server:

```bash
tail -f ~/slicktok/logs/deploy.log
```

You should see `deploy start`, a `git fetch`/`reset`, `npm ci`, and
`deploy done`, followed by PM2 reloading the app.

## 8. Keep yt-dlp itself up to date

TikTok changes its internals often enough that `yt-dlp` ships fixes
independently of anything in this repository. `scripts/deploy.sh`
already updates it on every code deploy, but add a daily cron job too,
so it stays current even between deploys:

```bash
crontab -e
```

Add:

```cron
0 4 * * * yt-dlp -U >> /home/YOUR_USER/slicktok/logs/ytdlp-update.log 2>&1 && pm2 reload slicktok
```

(Replace `YOUR_USER` with your actual home directory.)

## 9. Logs

- `pm2 logs slicktok`, live application logs (stdout/stderr).
- `~/slicktok/logs/deploy.log`, auto-deploy history.
- `~/slicktok/logs/ytdlp-update.log`, daily yt-dlp update output.

Consider `pm2 install pm2-logrotate` if these grow large over time,
it's a standard PM2 module, not something this project ships.

## 10. Manual redeploy (if you ever need it without the webhook)

```bash
cd ~/slicktok
bash scripts/deploy.sh
tail logs/deploy.log
```

## Troubleshooting

- **`{"ok":true}` fails locally but works over PuTTY's own curl**:
  make sure you're testing `localhost:3005` on the server itself, not
  from your own machine (that has to go through the tunnel).
- **Cloudflare shows the tunnel as unhealthy**: check
  `sudo systemctl status cloudflared` on the server.
- **Webhook deliveries show 401**: the secret in GitHub doesn't match
  `DEPLOY_WEBHOOK_SECRET` in `.env`, they must be identical, and PM2
  needs a reload (`pm2 reload slicktok --update-env`) after you change
  `.env`.
- **`yt-dlp` errors resolving a link that works in a browser**: run
  `yt-dlp -j <the link>` directly on the server, if that also fails,
  it's a `yt-dlp`/TikTok issue upstream, not this codebase; check for
  a newer `yt-dlp` release.
- **Browser console shows a CSP error blocking an inline script**
  (`script-src-elem` / `script-src`), with a hash like
  `'sha256-...'` and a line number in the page itself, not in
  `app.js`: this is almost certainly Cloudflare's **Rocket Loader**
  (or, less commonly, **Email Address Obfuscation**), a
  performance/anti-scraping feature that rewrites your page and
  injects its own inline `<script>` at the edge, before it reaches the
  browser. SlickTok's server never emits inline scripts, so if you see
  this, it was added after the response left the app. Fix: in the
  Cloudflare dashboard, go to your zone, **Speed → Optimization**, and
  turn **Rocket Loader** off (and check **Scrape Shield → Email
  Address Obfuscation** too). There's nothing to fix in the codebase,
  the CSP is doing exactly what it's supposed to.
