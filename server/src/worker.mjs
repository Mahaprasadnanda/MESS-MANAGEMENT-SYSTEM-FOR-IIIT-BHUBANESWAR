import { env as workerEnv } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';

// Worker bindings are exposed to the existing CommonJS configuration modules.
// Do not validate dashboard secrets at global scope: deployment builds upload
// the Worker before runtime bindings are attached to the running version.
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

export default httpServerHandler({ port: 8787 });
