const crypto = require('crypto');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const {
  MEAL_PRICES,
  MEAL_LABELS,
  SAME_DAY_MEAL_PRICES,
} = require('../utils/constants');
const {
  getBookingWindowIST,
  getSameDayBookingWindowIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
} = require('../utils/dateIst');
const { formatWeeklyBooking } = require('./bookingService');

function generateCouponCode(mealDateStr, mealType) {
  const compactDate = mealDateStr.replace(/-/g, '');
  const mealPrefix = mealType.charAt(0); // B, L, D
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `IIIT-${compactDate}-${mealPrefix}-${rand}`;
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!env.razorpayKeySecret) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(String(signature), 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

async function verifyPaymentAndConfirmBooking({
  studentId,
  bookingId,
  paymentId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  now = new Date(),
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: {
        select: { id: true, fullName: true, email: true, studentId: true },
      },
      weeklyBooking: {
        include: {
          mealBookings: {
            orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
          },
        },
      },
    },
  });

  if (!payment || payment.studentId !== studentId || payment.weeklyBookingId !== bookingId) {
    throw new ApiError(404, 'Payment record not found.');
  }

  if (payment.razorpayOrderId !== razorpay_order_id) {
    throw new ApiError(400, 'Order ID mismatch.');
  }

  if (payment.status === 'PAID') {
    throw new ApiError(409, 'This payment has already been verified.');
  }

  if (payment.weeklyBooking.bookingStatus === 'CONFIRMED') {
    throw new ApiError(409, 'This weekly booking is already confirmed.');
  }

  const bookingType = payment.weeklyBooking.bookingType || 'WEEKLY';

  // Enforce strict IST deadline on verification (Weekly = Mon 00:00 IST, Same-Day = 6AM / 10AM / 5PM IST)
  if (bookingType === 'SAME_DAY') {
    const sameDayWindow = getSameDayBookingWindowIST(now);
    const sameDayMealTypes = payment.weeklyBooking.mealBookings.map((mb) => mb.mealType);
    const invalidMeal = payment.weeklyBooking.mealBookings.find((mb) => {
      const mDateStr = toDateStrFromUTCDate(mb.mealDate);
      const slot = sameDayWindow.slots[mb.mealType];
      return mDateStr !== sameDayWindow.todayStr || !slot || !slot.isWindowOpen;
    });

    if (invalidMeal || sameDayMealTypes.length === 0) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: 'Same-day booking cutoff time passed before payment confirmation.',
        },
      });
      throw new ApiError(
        400,
        'Same-day meal booking cutoff has passed (Breakfast < 6 AM, Lunch < 10 AM, Dinner < 5 PM IST). This booking can no longer be confirmed.'
      );
    }
  } else {
    const bookingWeekStart = toDateStrFromUTCDate(payment.weeklyBooking.weekStartDate);
    const window = getBookingWindowIST(now);
    if (!window.isBookingOpen || bookingWeekStart !== window.targetWeekStartStr) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: 'Booking deadline passed before payment confirmation.',
        },
      });
      throw new ApiError(
        400,
        'Booking deadline has passed (Monday 00:00:00 IST). This booking can no longer be confirmed.'
      );
    }
  }

  // Verify signature according to provider
  if (payment.provider === 'RAZORPAY') {
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!isValid) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failureReason: 'Razorpay signature verification failed.',
          },
        }),
        prisma.weeklyBooking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'FAILED' },
        }),
      ]);
      throw new ApiError(400, 'Payment signature verification failed. Booking was not confirmed.');
    }
  } else if (payment.provider === 'DEV_SIMULATOR') {
    if (!env.isDev) {
      throw new ApiError(403, 'Development payment simulator is disabled outside development mode.');
    }
    if (razorpay_signature !== 'DEV_SIMULATED_SIGNATURE') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failureReason: 'Invalid simulator confirmation token.',
          },
        }),
        prisma.weeklyBooking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'FAILED' },
        }),
      ]);
      throw new ApiError(400, 'Invalid development payment confirmation.');
    }
  } else {
    throw new ApiError(400, 'Unsupported payment provider.');
  }

  const paidAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${studentId} FOR UPDATE`;

    // Prevent race-condition double booking of the same today's meal across concurrent orders
    if (bookingType === 'SAME_DAY') {
      const todayDateObj = parseDateOnlyUTC(getSameDayBookingWindowIST(now).todayStr);
      const mealTypesRequested = payment.weeklyBooking.mealBookings.map((mb) => mb.mealType);
      const alreadyConfirmed = await tx.mealBooking.findMany({
        where: {
          mealDate: todayDateObj,
          mealType: { in: mealTypesRequested },
          weeklyBooking: {
            studentId,
            bookingStatus: 'CONFIRMED',
            paymentStatus: 'PAID',
          },
        },
        select: { mealType: true },
      });

      if (alreadyConfirmed.length > 0) {
        const labels = alreadyConfirmed.map((m) => MEAL_LABELS[m.mealType] || m.mealType).join(', ');
        throw new ApiError(
          409,
          `Today's ${labels} is already booked and confirmed on another order.`
        );
      }
    }

    // Atomic conditional update prevents concurrent double confirmation
    const bookingUpdate = await tx.weeklyBooking.updateMany({
      where: {
        id: bookingId,
        bookingStatus: 'PENDING',
      },
      data: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });

    if (bookingUpdate.count === 0) {
      throw new ApiError(409, 'Booking was already confirmed or cancelled.');
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        transactionId: razorpay_payment_id,
        paidAt,
      },
    });

    const couponsData = payment.weeklyBooking.mealBookings.map((mb) => {
      const mealDateStr = toDateStrFromUTCDate(mb.mealDate);
      const couponCode = generateCouponCode(mealDateStr, mb.mealType);
      const qrPayload = JSON.stringify({
        v: 1,
        code: couponCode,
        sid: payment.student.studentId || payment.student.id,
        date: mealDateStr,
        meal: mb.mealType,
      });

      return {
        couponCode,
        weeklyBookingId: bookingId,
        mealBookingId: mb.id,
        studentId,
        mealDate: mb.mealDate,
        mealType: mb.mealType,
        qrPayload,
        status: 'ACTIVE',
      };
    });

    await tx.coupon.createMany({
      data: couponsData,
    });

    const confirmedBooking = await tx.weeklyBooking.findUnique({
      where: { id: bookingId },
      include: {
        mealBookings: {
          orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
          include: { coupon: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const createdCoupons = await tx.coupon.findMany({
      where: { weeklyBookingId: bookingId },
      orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
    });

    return {
      booking: formatWeeklyBooking(confirmedBooking),
      payment: {
        id: updatedPayment.id,
        transactionId: updatedPayment.transactionId,
        razorpayOrderId: updatedPayment.razorpayOrderId,
        razorpayPaymentId: updatedPayment.razorpayPaymentId,
        amount: Number(updatedPayment.amount),
        currency: updatedPayment.currency,
        provider: updatedPayment.provider,
        status: updatedPayment.status,
        paidAt: updatedPayment.paidAt,
      },
      couponsCount: createdCoupons.length,
    };
  });

  return result;
}

async function recordPaymentFailure({ studentId, bookingId, paymentId, reason }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { weeklyBooking: true },
  });

  if (!payment || payment.studentId !== studentId || payment.weeklyBookingId !== bookingId) {
    throw new ApiError(404, 'Payment record not found.');
  }

  if (payment.status === 'PAID') {
    throw new ApiError(409, 'Payment is already marked as paid.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: reason || 'Payment cancelled or failed during checkout.',
      },
    });

    if (payment.weeklyBooking.bookingStatus === 'PENDING') {
      await tx.weeklyBooking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'FAILED' },
      });
    }
  });

  return {
    paymentId: payment.id,
    status: 'FAILED',
    message: 'Payment failure recorded. No meal coupons were generated.',
  };
}

async function getStudentPayments(studentId) {
  const payments = await prisma.payment.findMany({
    where: { studentId },
    include: {
      student: {
        select: { id: true, fullName: true, email: true, studentId: true },
      },
      weeklyBooking: {
        select: {
          id: true,
          bookingCode: true,
          bookingType: true,
          sameDayDate: true,
          weekStartDate: true,
          weekEndDate: true,
          breakfastCount: true,
          lunchCount: true,
          dinnerCount: true,
          totalMeals: true,
          totalAmount: true,
          bookingStatus: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments.map((p) => {
    const bType = p.weeklyBooking.bookingType || 'WEEKLY';
    return {
      id: p.id,
      transactionId: p.transactionId || p.razorpayOrderId || p.id,
      bookingId: p.weeklyBooking.id,
      bookingCode: p.weeklyBooking.bookingCode,
      bookingType: bType,
      sameDayDate: p.weeklyBooking.sameDayDate
        ? toDateStrFromUTCDate(p.weeklyBooking.sameDayDate)
        : null,
      mealPrices: bType === 'SAME_DAY' ? SAME_DAY_MEAL_PRICES : MEAL_PRICES,
      weekStartDate: toDateStrFromUTCDate(p.weeklyBooking.weekStartDate),
      weekEndDate: toDateStrFromUTCDate(p.weeklyBooking.weekEndDate),
      breakfastCount: p.weeklyBooking.breakfastCount,
      lunchCount: p.weeklyBooking.lunchCount,
      dinnerCount: p.weeklyBooking.dinnerCount,
      totalMeals: p.weeklyBooking.totalMeals,
      amount: Number(p.amount),
      currency: p.currency,
      provider: p.provider,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      status: p.status,
      failureReason: p.failureReason,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      student: p.student,
    };
  });
}

module.exports = {
  verifyRazorpaySignature,
  verifyPaymentAndConfirmBooking,
  recordPaymentFailure,
  getStudentPayments,
};
