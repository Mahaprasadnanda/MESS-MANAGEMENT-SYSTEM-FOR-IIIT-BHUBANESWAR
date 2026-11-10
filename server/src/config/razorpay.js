const Razorpay = require('razorpay');
const env = require('./env');

let razorpayInstance = null;

function getRazorpayClient() {
  if (!env.hasRazorpayCredentials) {
    return null;
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }
  return razorpayInstance;
}

module.exports = {
  getRazorpayClient,
};
