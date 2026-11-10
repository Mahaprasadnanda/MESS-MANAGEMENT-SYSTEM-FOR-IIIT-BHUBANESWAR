import { env as workerEnv } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

if (!workerEnv.HYPERDRIVE?.connectionString) {
  throw new Error('The HYPERDRIVE binding is missing. Bind the iiit-mess-db Hyperdrive configuration.');
}
if (!workerEnv.JWT_SECRET || workerEnv.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET as a Cloudflare Worker secret (at least 32 characters).');
}
if (!workerEnv.CLIENT_URL) {
  throw new Error('Set CLIENT_URL to the deployed Cloudflare Pages frontend URL.');
}

// Make Worker bindings available to the existing CommonJS configuration modules.
// Secrets remain in Cloudflare and are never written to the repository.
globalThis.__iiitMessWorkerEnv = workerEnv;
process.env.NODE_ENV = 'production';

for (const key of [
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
  'MESS_EMAIL',
  'MESS_INITIAL_PASSWORD',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
]) {
  const value = workerEnv[key];
  if (typeof value === 'string' && value.length > 0) {
    process.env[key] = value;
  }
}

const app = require('./app.js');
app.listen(8787);

// Cloudflare's Node HTTP bridge lets the existing Express application run
// without changing its API routes or controllers.
export default httpServerHandler({ port: 8787 });
