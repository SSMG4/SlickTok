import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

function clientKey(req) {
  return req.headers['cf-connecting-ip'] || req.ip;
}

export const hourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.rateLimitPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: { error: `Hourly limit of ${config.rateLimitPerHour} videos reached. Try again later.` },
});

export const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: config.rateLimitPerDay,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: { error: `Daily limit of ${config.rateLimitPerDay} videos reached. Try again tomorrow.` },
});
