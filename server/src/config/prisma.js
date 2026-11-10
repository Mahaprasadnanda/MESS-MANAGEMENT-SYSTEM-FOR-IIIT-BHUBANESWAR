const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__iiitMessPrisma ||
  new PrismaClient({
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });

if (!env.isProd) {
  globalForPrisma.__iiitMessPrisma = prisma;
}

module.exports = prisma;
