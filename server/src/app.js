const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const prisma = require('./config/prisma');
const apiRoutes = require('./routes');
const { apiRateLimiter } = require('./middleware/rateLimitMiddleware');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const isWorkerRuntime = Boolean(globalThis.__iiitMessWorkerEnv);

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

// Runtime bindings are validated on requests because dashboard secrets are
// attached to the deployed Worker, not the build process that uploads it.
function validateWorkerRuntime(req, res, next) {
  if (!isWorkerRuntime) return next();

  const bindings = globalThis.__iiitMessWorkerEnv;
  if (!bindings?.JWT_SECRET || bindings.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: 'Worker secret JWT_SECRET is not configured (minimum 32 characters).' });
  }
  if (!bindings?.CLIENT_URL) {
    return res.status(503).json({ error: 'Worker variable CLIENT_URL is not configured.' });
  }
  if (!bindings?.HYPERDRIVE?.connectionString) {
    return res.status(503).json({ error: 'Worker Hyperdrive binding is not configured.' });
  }
  next();
}

app.use('/api', validateWorkerRuntime, prisma.withPrismaRequest, apiRateLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
