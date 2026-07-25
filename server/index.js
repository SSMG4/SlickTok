import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import webhookRoutes from './routes/webhook.js';
import apiRoutes from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const repoRoot = path.join(__dirname, '..');

function currentCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const app = express();

// Only cloudflared talks to us (loopback); trust the X-Forwarded-* headers
// it sets from that single hop, nothing further upstream.
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

// Webhook route is mounted before the JSON body parser: GitHub's HMAC
// signature is computed over the raw request bytes, so this route parses
// its own body and must run first.
app.use('/api', webhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRoutes);

app.use(express.static(publicDir, { maxAge: '1h', extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(config.port, () => {
  console.log(`SlickTok listening on http://localhost:${config.port} (commit ${currentCommit()})`);
});
