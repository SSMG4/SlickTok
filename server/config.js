import 'dotenv/config';

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: int(process.env.PORT, 3000),
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${int(process.env.PORT, 3000)}`,
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  deployWebhookSecret: process.env.DEPLOY_WEBHOOK_SECRET || '',
  deployBranch: process.env.DEPLOY_BRANCH || 'main',
  rateLimitPerHour: int(process.env.RATE_LIMIT_PER_HOUR, 50),
  rateLimitPerDay: int(process.env.RATE_LIMIT_PER_DAY, 1000),
};
