const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { apiRateLimiter } = require('./middleware/rateLimitMiddleware');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/webhooks/razorpay')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!env.isProd) {
  app.use(morgan('dev'));
}

app.use('/api', apiRateLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
