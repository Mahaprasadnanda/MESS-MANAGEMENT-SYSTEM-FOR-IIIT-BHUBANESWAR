const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma.');

    const server = app.listen(env.port, () => {
      console.log(
        `IIIT BBSR Mess API running on http://localhost:${env.port} (${env.nodeEnv})`
      );
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
