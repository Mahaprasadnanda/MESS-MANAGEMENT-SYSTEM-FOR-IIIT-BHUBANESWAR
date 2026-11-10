const crypto = require('crypto');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { getRazorpayClient } = require('../config/razorpay');
const ApiError = require('../utils/apiError');
const {
  MEAL_PRICES,
  MEAL_TYPES,
  MEAL_LABELS,
  SAME_DAY_MEAL_PRICES,
  MIN_WEEKLY_BOOKING_AMOUNT,
} = require('../utils/constants');
const {
  getBookingWindowIST,
  getSameDayBookingWindowIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
  getDayNameFromDateStr,
} = require('../utils/dateIst');
const { getDailyMenu } = require('./menuService');

function generateBookingCode(weekStartStr) {
  const compact = weekStartStr.replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK-${compact}-${rand}`;
}

function generateSameDayBookingCode(dateStr) {
  const compact = dateStr.replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SD-${compact}-${rand}`;
}

function generateDevSignatureToken(orderId, paymentId) {
  return crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`DEV_SIM|${orderId}|${paymentId}`)
    .digest('hex');
}

function formatWeeklyBooking(booking) {
  if (!booking) return null;
  const bookingType = booking.bookingType || 'WEEKLY';
  const mealDates = (booking.mealBookings || []).map((mb) => toDateStrFromUTCDate(mb.mealDate));
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    bookingType,
    sameDayDate: booking.sameDayDate
      ? toDateStrFromUTCDate(booking.sameDayDate)
      : bookingType === 'SAME_DAY'
        ? mealDates[0] || null
        : null,
    mealPrices: bookingType === 'SAME_DAY' ? SAME_DAY_MEAL_PRICES : MEAL_PRICES,
    studentId: booking.studentId,
    weekStartDate: toDateStrFromUTCDate(booking.weekStartDate),
    weekEndDate: toDateStrFromUTCDate(booking.weekEndDate),
    breakfastCount: booking.breakfastCount,
    lunchCount: booking.lunchCount,
    dinnerCount: booking.dinnerCount,
    totalMeals: booking.totalMeals,
    totalAmount: Number(booking.totalAmount),
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    student: booking.student
      ? {
          id: booking.student.id,
          fullName: booking.student.fullName,
          email: booking.student.email,
          studentId: booking.student.studentId,
        }
      : undefined,
    mealBookings: (booking.mealBookings || []).map((mb) => ({
      id: mb.id,
      mealDate: toDateStrFromUTCDate(mb.mealDate),
      dayName: getDayNameFromDateStr(toDateStrFromUTCDate(mb.mealDate)),
      mealType: mb.mealType,
      price: Number(mb.price),
      coupon: mb.coupon
        ? {
            id: mb.coupon.id,
            couponCode: mb.coupon.couponCode,
            status: mb.coupon.status,
            redeemedAt: mb.coupon.redeemedAt,
          }
        : null,
    })),
    payments: (booking.payments || []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      provider: p.provider,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      transactionId: p.transactionId,
      status: p.status,
      failureReason: p.failureReason,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  };
}

/**
 * Validates that requested week and meals strictly adhere to the upcoming Monday-Sunday window.
 */
function validateWeeklyBookingWindow(weekStartDate, meals, now = new Date()) {
  const window = getBookingWindowIST(now);

  if (!window.isBookingOpen) {
    throw new ApiError(400, 'Booking window for the target week is currently closed.');
  }

  if (weekStartDate < window.targetWeekStartStr) {
    throw new ApiError(
      400,
      `Booking closed: You cannot book for current or past weeks. Bookings are currently open only for ${window.targetWeekStartStr} to ${window.targetWeekEndStr}.`
    );
  }

  if (weekStartDate > window.targetWeekStartStr) {
    throw new ApiError(
      400,
      `You can only book for the immediately upcoming week (${window.targetWeekStartStr} to ${window.targetWeekEndStr}). Booking further ahead is not permitted.`
    );
  }

  const validDateSet = new Set(window.targetWeekDates);
  const uniqueMealKeys = new Set();

  for (const meal of meals) {
    if (!validDateSet.has(meal.mealDate)) {
      throw new ApiError(
        400,
        `Meal date ${meal.mealDate} is outside the upcoming bookable week (${window.targetWeekStartStr} to ${window.targetWeekEndStr}).`
      );
    }
    const key = `${meal.mealDate}|${meal.mealType}`;
    if (uniqueMealKeys.has(key)) {
      throw new ApiError(400, `Duplicate meal selection for ${meal.mealDate} (${meal.mealType}).`);
    }
    uniqueMealKeys.add(key);
  }

  return window;
}

function computeAuthoritativeTotals(meals, priceTable = MEAL_PRICES) {
  let breakfastCount = 0;
  let lunchCount = 0;
  let dinnerCount = 0;

  for (const m of meals) {
    if (m.mealType === 'BREAKFAST') breakfastCount += 1;
    else if (m.mealType === 'LUNCH') lunchCount += 1;
    else if (m.mealType === 'DINNER') dinnerCount += 1;
  }

  const totalMeals = breakfastCount + lunchCount + dinnerCount;
  const totalAmount =
    breakfastCount * priceTable.BREAKFAST +
    lunchCount * priceTable.LUNCH +
    dinnerCount * priceTable.DINNER;

  return {
    breakfastCount,
    lunchCount,
    dinnerCount,
    totalMeals,
    totalAmount,
  };
}

/**
 * Validates that requested same-day booking strictly targets today in IST
 * and each selected meal is strictly before its IST cutoff (6 AM / 10 AM / 5 PM).
 */
function validateSameDayBookingSelection(mealDate, mealTypes, now = new Date()) {
  const sameDayWindow = getSameDayBookingWindowIST(now);

  if (mealDate && mealDate !== sameDayWindow.todayStr) {
    throw new ApiError(
      400,
      `Same-day meal booking is valid strictly for today (${sameDayWindow.todayStr} IST). Selected date ${mealDate} is not permitted.`
    );
  }

  if (!Array.isArray(mealTypes) || mealTypes.length === 0) {
    throw new ApiError(400, 'Please select at least one meal for today.');
  }

  const seen = new Set();
  for (const mealType of mealTypes) {
    if (seen.has(mealType)) {
      throw new ApiError(400, `Duplicate meal selection for ${mealType}.`);
    }
    seen.add(mealType);

    const slot = sameDayWindow.slots[mealType];
    if (!slot || !slot.isWindowOpen) {
      throw new ApiError(
        400,
        `Same-day booking cutoff passed for ${slot?.label || mealType} (${slot?.cutoffDisplay || 'cutoff exceeded'}). It can no longer be booked for today.`
      );
    }
  }

  return {
    sameDayWindow,
    mealTypes: Array.from(seen),
  };
}

async function getStudentBookingWindow(studentId, now = new Date()) {
  const window = getBookingWindowIST(now);
  const weeklySlotKey = `${studentId}|${window.targetWeekStartStr}`;
  const existing = await prisma.weeklyBooking.findUnique({
    where: {
      weeklySlotKey,
    },
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

  return {
    window,
    mealPrices: MEAL_PRICES,
    minBookingAmount: MIN_WEEKLY_BOOKING_AMOUNT,
    paymentGatewayMode: env.hasRazorpayCredentials
      ? 'RAZORPAY'
      : env.isDev
        ? 'DEV_SIMULATOR'
        : 'UNCONFIGURED',
    isRazorpayTestMode: env.isRazorpayTestMode,
    existingBooking: formatWeeklyBooking(existing),
  };
}

async function getStudentSameDayWindow(studentId, now = new Date()) {
  const sameDayWindow = getSameDayBookingWindowIST(now);
  const todayDateObj = parseDateOnlyUTC(sameDayWindow.todayStr);

  const [todayConfirmedMeals, pendingSameDay, todayMenu] = await Promise.all([
    prisma.mealBooking.findMany({
      where: {
        mealDate: todayDateObj,
        weeklyBooking: {
          studentId,
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
      },
      include: {
        weeklyBooking: {
          select: { id: true, bookingCode: true, bookingType: true },
        },
        coupon: {
          select: { id: true, couponCode: true, status: true },
        },
      },
    }),
    prisma.weeklyBooking.findFirst({
      where: {
        studentId,
        bookingType: 'SAME_DAY',
        sameDayDate: todayDateObj,
        bookingStatus: 'PENDING',
      },
      include: {
        mealBookings: {
          orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
          include: { coupon: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getDailyMenu(sameDayWindow.todayStr),
  ]);

  const confirmedByMeal = new Map();
  for (const mb of todayConfirmedMeals) {
    confirmedByMeal.set(mb.mealType, mb);
  }

  const slots = {};
  for (const mealType of MEAL_TYPES) {
    const baseSlot = sameDayWindow.slots[mealType];
    const existingMeal = confirmedByMeal.get(mealType);
    slots[mealType] = {
      ...baseSlot,
      alreadyBooked: Boolean(existingMeal),
      bookedSource: existingMeal?.weeklyBooking?.bookingType || null,
      bookedBookingCode: existingMeal?.weeklyBooking?.bookingCode || null,
      existingCouponCode: existingMeal?.coupon?.couponCode || null,
      existingCouponStatus: existingMeal?.coupon?.status || null,
      canBook: baseSlot.isWindowOpen && !existingMeal,
    };
  }

  return {
    sameDayWindow: {
      ...sameDayWindow,
      slots,
      availableCount: MEAL_TYPES.filter((t) => slots[t].canBook).length,
    },
    mealPrices: SAME_DAY_MEAL_PRICES,
    minBookingAmount: 0,
    todayMenu,
    paymentGatewayMode: env.hasRazorpayCredentials
      ? 'RAZORPAY'
      : env.isDev
        ? 'DEV_SIMULATOR'
        : 'UNCONFIGURED',
    isRazorpayTestMode: env.isRazorpayTestMode,
    pendingSameDayBooking: formatWeeklyBooking(pendingSameDay),
  };
}

async function createGatewayOrderAndPayment({ booking, totals, student, notesMeta = {} }) {
  const amountInPaise = Math.round(totals.totalAmount * 100);
  const razorpay = getRazorpayClient();

  let paymentMode;
  let orderId;

  if (razorpay) {
    paymentMode = 'RAZORPAY';
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: booking.bookingCode,
        notes: {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          bookingType: booking.bookingType || 'WEEKLY',
          studentId: student.studentId || student.id,
          ...notesMeta,
        },
      });
      orderId = rzpOrder.id;
    } catch (rzpErr) {
      const rzpMessage =
        rzpErr?.error?.description ||
        rzpErr?.message ||
        'Unable to create Razorpay test order. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.';
      throw new ApiError(502, `Payment gateway error: ${rzpMessage}`);
    }
  } else if (env.isDev) {
    paymentMode = 'DEV_SIMULATOR';
    orderId = `order_dev_${crypto.randomBytes(8).toString('hex')}`;
  } else {
    throw new ApiError(
      503,
      'Online payment gateway is currently unavailable. Please configure Razorpay credentials.'
    );
  }

  const payment = await prisma.payment.create({
    data: {
      weeklyBookingId: booking.id,
      studentId: student.id,
      amount: totals.totalAmount,
      currency: 'INR',
      provider: paymentMode,
      razorpayOrderId: orderId,
      status: 'PENDING',
    },
  });

  return {
    booking: formatWeeklyBooking(booking),
    payment: {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
    },
    paymentMode,
    isRazorpayTestMode: env.isRazorpayTestMode,
    razorpayKeyId: paymentMode === 'RAZORPAY' ? env.razorpayKeyId : null,
    order: {
      id: orderId,
      amount: amountInPaise,
      amountRupees: totals.totalAmount,
      currency: 'INR',
      receipt: booking.bookingCode,
    },
    prefill: {
      name: student.fullName,
      email: student.email,
    },
  };
}

async function createBookingOrder({ studentId, weekStartDate, meals, now = new Date() }) {
  const window = validateWeeklyBookingWindow(weekStartDate, meals, now);
  const totals = computeAuthoritativeTotals(meals);

  if (totals.totalMeals === 0 || totals.totalAmount <= 0) {
    throw new ApiError(400, 'Please select at least one meal to proceed.');
  }

  if (totals.totalAmount < MIN_WEEKLY_BOOKING_AMOUNT) {
    const amountLeft = MIN_WEEKLY_BOOKING_AMOUNT - totals.totalAmount;
    throw new ApiError(
      400,
      `Minimum weekly booking amount is ₹${MIN_WEEKLY_BOOKING_AMOUNT}. Please add meals worth ₹${amountLeft} more to proceed.`
    );
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, email: true, studentId: true, role: true },
  });

  if (!student || student.role !== 'STUDENT') {
    throw new ApiError(403, 'Only students can create meal bookings.');
  }

  const weekStartObj = parseDateOnlyUTC(window.targetWeekStartStr);
  const weekEndObj = parseDateOnlyUTC(window.targetWeekEndStr);
  const weeklySlotKey = `${studentId}|${window.targetWeekStartStr}`;

  // Create or update unpaid pending weekly booking atomically
  const booking = await prisma.$transaction(async (tx) => {
    const existing = await tx.weeklyBooking.findUnique({
      where: {
        weeklySlotKey,
      },
    });

    if (existing) {
      if (existing.bookingStatus === 'CONFIRMED' || existing.paymentStatus === 'PAID') {
        throw new ApiError(
          409,
          `You have already booked and paid for the week of ${window.targetWeekStartStr} to ${window.targetWeekEndStr}.`
        );
      }

      // Replace meal selections on existing unpaid booking
      await tx.mealBooking.deleteMany({
        where: { weeklyBookingId: existing.id },
      });

      return tx.weeklyBooking.update({
        where: { id: existing.id },
        data: {
          breakfastCount: totals.breakfastCount,
          lunchCount: totals.lunchCount,
          dinnerCount: totals.dinnerCount,
          totalMeals: totals.totalMeals,
          totalAmount: totals.totalAmount,
          bookingStatus: 'PENDING',
          paymentStatus: 'PENDING',
          mealBookings: {
            create: meals.map((m) => ({
              mealDate: parseDateOnlyUTC(m.mealDate),
              mealType: m.mealType,
              price: MEAL_PRICES[m.mealType],
            })),
          },
        },
        include: {
          mealBookings: {
            orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
          },
        },
      });
    }

    return tx.weeklyBooking.create({
      data: {
        bookingCode: generateBookingCode(window.targetWeekStartStr),
        bookingType: 'WEEKLY',
        weeklySlotKey,
        sameDayDate: null,
        studentId,
        weekStartDate: weekStartObj,
        weekEndDate: weekEndObj,
        breakfastCount: totals.breakfastCount,
        lunchCount: totals.lunchCount,
        dinnerCount: totals.dinnerCount,
        totalMeals: totals.totalMeals,
        totalAmount: totals.totalAmount,
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        mealBookings: {
          create: meals.map((m) => ({
            mealDate: parseDateOnlyUTC(m.mealDate),
            mealType: m.mealType,
            price: MEAL_PRICES[m.mealType],
          })),
        },
      },
      include: {
        mealBookings: {
          orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
        },
      },
    });
  });

  return createGatewayOrderAndPayment({
    booking,
    totals,
    student,
    notesMeta: { weekStartDate: window.targetWeekStartStr },
  });
}

async function createSameDayBookingOrder({ studentId, mealDate, mealTypes, now = new Date() }) {
  const { sameDayWindow, mealTypes: validMealTypes } = validateSameDayBookingSelection(
    mealDate,
    mealTypes,
    now
  );

  const meals = validMealTypes.map((mealType) => ({
    mealDate: sameDayWindow.todayStr,
    mealType,
  }));
  const totals = computeAuthoritativeTotals(meals, SAME_DAY_MEAL_PRICES);

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, email: true, studentId: true, role: true },
  });

  if (!student || student.role !== 'STUDENT') {
    throw new ApiError(403, 'Only students can create same-day meal bookings.');
  }

  const todayDateObj = parseDateOnlyUTC(sameDayWindow.todayStr);
  const currentWeekStartObj = parseDateOnlyUTC(sameDayWindow.currentWeekStartStr);
  const currentWeekEndObj = parseDateOnlyUTC(sameDayWindow.currentWeekEndStr);

  const booking = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${studentId} FOR UPDATE`;

    // Prevent duplicate meal booking for today (whether previously booked via weekly or earlier same-day)
    const existingConfirmedMeals = await tx.mealBooking.findMany({
      where: {
        mealDate: todayDateObj,
        mealType: { in: validMealTypes },
        weeklyBooking: {
          studentId,
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
      },
      select: { mealType: true },
    });

    if (existingConfirmedMeals.length > 0) {
      const labels = existingConfirmedMeals
        .map((m) => MEAL_LABELS[m.mealType] || m.mealType)
        .join(', ');
      throw new ApiError(
        409,
        `You already have a confirmed booking for today's ${labels}. Duplicate meal bookings for the same day are not allowed.`
      );
    }

    const existingPending = await tx.weeklyBooking.findFirst({
      where: {
        studentId,
        bookingType: 'SAME_DAY',
        sameDayDate: todayDateObj,
        bookingStatus: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      await tx.mealBooking.deleteMany({
        where: { weeklyBookingId: existingPending.id },
      });

      return tx.weeklyBooking.update({
        where: { id: existingPending.id },
        data: {
          breakfastCount: totals.breakfastCount,
          lunchCount: totals.lunchCount,
          dinnerCount: totals.dinnerCount,
          totalMeals: totals.totalMeals,
          totalAmount: totals.totalAmount,
          bookingStatus: 'PENDING',
          paymentStatus: 'PENDING',
          mealBookings: {
            create: validMealTypes.map((mealType) => ({
              mealDate: todayDateObj,
              mealType,
              price: SAME_DAY_MEAL_PRICES[mealType],
            })),
          },
        },
        include: {
          mealBookings: {
            orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
          },
        },
      });
    }

    return tx.weeklyBooking.create({
      data: {
        bookingCode: generateSameDayBookingCode(sameDayWindow.todayStr),
        bookingType: 'SAME_DAY',
        weeklySlotKey: null,
        sameDayDate: todayDateObj,
        studentId,
        weekStartDate: currentWeekStartObj,
        weekEndDate: currentWeekEndObj,
        breakfastCount: totals.breakfastCount,
        lunchCount: totals.lunchCount,
        dinnerCount: totals.dinnerCount,
        totalMeals: totals.totalMeals,
        totalAmount: totals.totalAmount,
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        mealBookings: {
          create: validMealTypes.map((mealType) => ({
            mealDate: todayDateObj,
            mealType,
            price: SAME_DAY_MEAL_PRICES[mealType],
          })),
        },
      },
      include: {
        mealBookings: {
          orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
        },
      },
    });
  });

  return createGatewayOrderAndPayment({
    booking,
    totals,
    student,
    notesMeta: { sameDayDate: sameDayWindow.todayStr },
  });
}

async function getStudentBookings(studentId) {
  const bookings = await prisma.weeklyBooking.findMany({
    where: { studentId },
    include: {
      mealBookings: {
        orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
        include: { coupon: true },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [{ weekStartDate: 'desc' }, { createdAt: 'desc' }],
  });

  return bookings.map(formatWeeklyBooking);
}

async function getStudentBookingById(studentId, bookingId) {
  const booking = await prisma.weeklyBooking.findFirst({
    where: { id: bookingId, studentId },
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

  if (!booking) {
    throw new ApiError(404, 'Booking not found.');
  }

  return formatWeeklyBooking(booking);
}

module.exports = {
  generateDevSignatureToken,
  formatWeeklyBooking,
  validateWeeklyBookingWindow,
  validateSameDayBookingSelection,
  computeAuthoritativeTotals,
  getStudentBookingWindow,
  getStudentSameDayWindow,
  createBookingOrder,
  createSameDayBookingOrder,
  getStudentBookings,
  getStudentBookingById,
};
