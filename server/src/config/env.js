// Cloudflare Worker bindings are exposed by src/worker.mjs before the app
// is dynamically imported. Avoid dotenv filesystem reads in Workers; retain
// .env loading for ordinary local Node.js development.
if (!globalThis.__iiitMessWorkerEnv) {
  const path = require('path');
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const NODE_ENV = globalThis.__iiitMessWorkerEnv
  ? 'production'
  : process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  if (NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be configured with at least 16 characters in production.');
  }
}

const isPlaceholder = (val) =>
  !val ||
  val.trim() === '' ||
  val.includes('replace-with') ||
  val.includes('your_razorpay');

const RAZORPAY_KEY_ID = isPlaceholder(process.env.RAZORPAY_KEY_ID) ? '' : process.env.RAZORPAY_KEY_ID.trim();
const RAZORPAY_KEY_SECRET = isPlaceholder(process.env.RAZORPAY_KEY_SECRET)
  ? ''
  : process.env.RAZORPAY_KEY_SECRET.trim();
const RAZORPAY_WEBHOOK_SECRET = isPlaceholder(process.env.RAZORPAY_WEBHOOK_SECRET)
  ? ''
  : process.env.RAZORPAY_WEBHOOK_SECRET.trim();

const env = {
  nodeEnv: NODE_ENV,
  isDev: NODE_ENV === 'development',
  isProd: NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: JWT_SECRET || 'dev-only-iiitbbs-mess-jwt-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  messEmail: (process.env.MESS_EMAIL || 'mess@iiit-bh.ac.in').trim().toLowerCase(),
  messInitialPassword: process.env.MESS_INITIAL_PASSWORD || 'mess1234',
  razorpayKeyId: RAZORPAY_KEY_ID,
  razorpayKeySecret: RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: RAZORPAY_WEBHOOK_SECRET,
  hasRazorpayCredentials: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
  isRazorpayTestMode: RAZORPAY_KEY_ID.startsWith('rzp_test_'),
};

module.exports = env;
