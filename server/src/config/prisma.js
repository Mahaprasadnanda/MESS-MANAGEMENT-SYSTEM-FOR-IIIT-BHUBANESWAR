const { AsyncLocalStorage } = require('node:async_hooks');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const env = require('./env');

const isWorkerRuntime = Boolean(globalThis.__iiitMessWorkerEnv);
const requestStorage = isWorkerRuntime ? new AsyncLocalStorage() : null;

function createPrismaClient(connectionString) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });
}

let localPrisma;
if (!isWorkerRuntime) {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required for local Node.js development.');
  }
  const globalForPrisma = globalThis;
  localPrisma =
    globalForPrisma.__iiitMessPrisma ||
    createPrismaClient(env.databaseUrl);

  if (!env.isProd) {
    globalForPrisma.__iiitMessPrisma = localPrisma;
  }
}

// Hyperdrive connections and Prisma clients must be created inside a request
// context. This middleware gives each Express request its own client context.
function withPrismaRequest(req, res, next) {
  if (!isWorkerRuntime) return next();

  try {
    const connectionString =
      globalThis.__iiitMessWorkerEnv?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
      throw new Error('The HYPERDRIVE binding is missing or has no connection string.');
    }

    const client = createPrismaClient(connectionString);
    let disconnected = false;
    const cleanup = () => {
      if (disconnected) return;
      disconnected = true;
      client.$disconnect().catch((error) => {
        console.error('Failed to disconnect request-scoped Prisma client:', error);
      });
    };

    res.once('finish', cleanup);
    res.once('close', cleanup);
    requestStorage.run({ client }, next);
  } catch (error) {
    next(error);
  }
}

const prisma = isWorkerRuntime
  ? new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'withPrismaRequest') return withPrismaRequest;
          const client = requestStorage.getStore()?.client;
          if (!client) {
            throw new Error(
              'Prisma was accessed outside an active request-scoped Worker context.'
            );
          }
          const value = Reflect.get(client, property, client);
          return typeof value === 'function' ? value.bind(client) : value;
        },
      }
    )
  : localPrisma;

if (!isWorkerRuntime) {
  prisma.withPrismaRequest = withPrismaRequest;
}

module.exports = prisma;
