const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const env = require('./env');

// In Workers, the entry point exposes the Hyperdrive binding before loading the
// application. Local Node.js development continues to use DATABASE_URL.
const workerBindings = globalThis.__iiitMessWorkerEnv;
const connectionString =
  workerBindings?.HYPERDRIVE?.connectionString || env.databaseUrl;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is required locally, or a Cloudflare HYPERDRIVE binding is required in production.'
  );
}

const adapter = new PrismaPg({ connectionString });
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__iiitMessPrisma ||
  new PrismaClient({
    adapter,
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });

if (!env.isProd) {
  globalForPrisma.__iiitMessPrisma = prisma;
}

module.exports = prisma;
