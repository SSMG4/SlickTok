import { Router } from 'express';
import express from 'express';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

const router = Router();

function verifyGithubSignature(secret, payload, signatureHeader) {
  if (!signatureHeader) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

// Raw body parsing is scoped to this single route: the HMAC signature GitHub
// sends is computed over the exact request bytes, so nothing upstream may
// parse or re-serialize the body before this middleware sees it.
router.post('/_deploy', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  if (!config.deployWebhookSecret || config.deployWebhookSecret === 'change-me') {
    console.warn('[webhook] rejected: DEPLOY_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ error: 'Auto-deploy is not configured on this server.' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!verifyGithubSignature(config.deployWebhookSecret, req.body, signature)) {
    console.warn('[webhook] rejected: signature check failed');
    return res.status(401).json({ error: 'Signature check failed.' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    console.warn('[webhook] rejected: could not parse payload');
    return res.status(400).json({ error: 'Could not parse payload.' });
  }

  const expectedRef = `refs/heads/${config.deployBranch}`;
  if (payload.ref !== expectedRef) {
    console.log(`[webhook] skipped: got ref "${payload.ref}", expected "${expectedRef}"`);
    return res.status(200).json({ skipped: true, reason: `${payload.ref} is not ${expectedRef}` });
  }

  console.log(`[webhook] accepted push to ${expectedRef}, spawning deploy.sh`);
  res.status(202).json({ accepted: true });

  const scriptPath = path.join(repoRoot, 'scripts', 'deploy.sh');
  const child = spawn('bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
    cwd: repoRoot,
  });
  child.on('error', (err) => {
    console.error('[webhook] failed to spawn deploy.sh:', err.message);
  });
  child.unref();
});

export default router;
