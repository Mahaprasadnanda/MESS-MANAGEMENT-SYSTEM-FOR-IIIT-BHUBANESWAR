const crypto = require('crypto');
const env = require('../config/env');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  if (!env.razorpayWebhookSecret) {
    throw new ApiError(503, 'Razorpay webhook secret is not configured.');
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature || !req.rawBody) {
    throw new ApiError(400, 'Missing Razorpay webhook signature or payload.');
  }

  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(req.rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const sigBuf = Buffer.from(String(signature), 'utf8');
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    throw new ApiError(400, 'Invalid webhook signature.');
  }

  const event = req.body;
  if (event?.event === 'payment.failed') {
    const paymentEntity = event?.payload?.payment?.entity;
    if (paymentEntity?.order_id) {
      await prisma.payment.updateMany({
        where: {
          razorpayOrderId: paymentEntity.order_id,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
          failureReason: paymentEntity.error_description || 'Payment failed via Razorpay webhook.',
        },
      });
    }
  }

  res.status(200).json({ received: true });
});

module.exports = {
  handleRazorpayWebhook,
};
