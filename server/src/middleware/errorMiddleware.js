const { Prisma } = require('@prisma/client');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'A record with this unique value already exists.';
      details = err.meta?.target || null;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record was not found.';
    } else {
      statusCode = 400;
      message = 'Database constraint violation.';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid database query parameters.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON request body.';
  }

  if (statusCode >= 500) {
    console.error('[Server Error]', err);
    if (env.isProd) {
      message = 'An unexpected server error occurred.';
      details = null;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
