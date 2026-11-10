const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');

const listMyPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.getStudentPayments(req.user.id);
  res.status(200).json({
    success: true,
    data: { payments },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPaymentAndConfirmBooking({
    studentId: req.user.id,
    ...req.validatedBody,
  });

  res.status(200).json({
    success: true,
    message: 'Payment verified and meal booking confirmed! Digital coupons generated.',
    data: result,
  });
});

const recordPaymentFailure = asyncHandler(async (req, res) => {
  const result = await paymentService.recordPaymentFailure({
    studentId: req.user.id,
    ...req.validatedBody,
  });

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

module.exports = {
  listMyPayments,
  verifyPayment,
  recordPaymentFailure,
};
