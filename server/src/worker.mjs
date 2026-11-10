import { env as workerEnv } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';

if (!workerEnv.HYPERDRIVE?.connectionString) {
  throw new Error('The HYPERDRIVE binding is missing. Bind the iiit-mess-db Hyperdrive configuration.');
}
if (!workerEnv.JWT_SECRET || workerEnv.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET as a Cloudflare Worker secret (at least 32 characters).');
}
if (!workerEnv.CLIENT_URL) {
  throw new Error('Set CLIENT_URL to the deployed Cloudflare Pages frontend URL.');
}

// Expose Worker bindings before loading the CommonJS application. The dynamic
// import ensures the existing Express configuration reads these values first.
globalThis.__iiitMessWorkerEnv = workerEnv;

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

const appModule = await import('./app.js');
const app = appModule.default ?? appModule;
app.listen(8787);

// Cloudflare's Node HTTP bridge lets the existing Express application run
// without changing its API routes or controllers.
export default httpServerHandler({ port: 8787 });
