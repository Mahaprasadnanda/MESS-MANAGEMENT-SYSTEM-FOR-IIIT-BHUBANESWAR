const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isWorkerRuntime = Boolean(globalThis.__iiitMessWorkerEnv);

/**
 * Cloudflare Workers cannot create background timers during module startup.
 * express-rate-limit's default MemoryStore starts a setInterval() cleanup
 * timer in init(), which makes the Worker fail validation before deployment.
 *
 * For Workers, use a small per-isolate fixed-window limiter with lazy expiry.
 * It intentionally creates no timers. This is best-effort protection only:
 * isolate restarts and multiple isolates do not share this in-memory state.
 * For globally consistent limits, configure Cloudflare Rate Limiting rules
 * at the edge in addition to this middleware.
 */
function createWorkerRateLimiter({ windowMs, max, message }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.headers['cf-connecting-ip'] || 'unknown';
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    // Opportunistic cleanup avoids background timers and bounds stale entries.
    if (buckets.size > 1000) {
      for (const [entryKey, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(entryKey);
      }
    }

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json(message);
    }

    next();
  };
}

function createRateLimiter(options) {
  return isWorkerRuntime ? createWorkerRateLimiter(options) : rateLimit(options);
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 25 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
  },
});

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 500 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

module.exports = {
  authRateLimiter,
  apiRateLimiter,
};
