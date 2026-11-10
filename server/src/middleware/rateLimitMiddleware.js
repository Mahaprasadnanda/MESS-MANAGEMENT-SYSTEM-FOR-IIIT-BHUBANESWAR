const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isProd ? 25 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
  },
});

const apiRateLimiter = rateLimit({
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
