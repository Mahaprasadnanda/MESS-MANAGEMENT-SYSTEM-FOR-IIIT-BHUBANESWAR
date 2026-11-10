const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');
const {
  formatDateStringIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
  getDayNameFromDateStr,
  getISTParts,
} = require('../utils/dateIst');

async function syncExpiredCoupons(extraWhere = {}, now = new Date()) {
  const todayStr = formatDateStringIST(now);
  const todayDate = parseDateOnlyUTC(todayStr);

  await prisma.coupon.updateMany({
    where: {
      ...extraWhere,
      status: 'ACTIVE',
      mealDate: { lt: todayDate },
    },
    data: {
      status: 'EXPIRED',
    },
  });
}

function formatCoupon(coupon) {
  const mealDateStr = toDateStrFromUTCDate(coupon.mealDate);
  return {
    id: coupon.id,
    couponCode: coupon.couponCode,
    weeklyBookingId: coupon.weeklyBookingId,
    bookingCode: coupon.weeklyBooking?.bookingCode,
    bookingType: coupon.weeklyBooking?.bookingType || 'WEEKLY',
    studentId: coupon.studentId,
    studentRollId: coupon.student?.studentId,
    studentName: coupon.student?.fullName,
    studentEmail: coupon.student?.email,
    mealDate: mealDateStr,
    dayName: getDayNameFromDateStr(mealDateStr),
    mealType: coupon.mealType,
    qrPayload: coupon.qrPayload,
    status: coupon.status,
    redeemedAt: coupon.redeemedAt,
    redeemedBy: coupon.redeemedBy
      ? {
          id: coupon.redeemedBy.id,
          fullName: coupon.redeemedBy.fullName,
          email: coupon.redeemedBy.email,
        }
      : null,
    createdAt: coupon.createdAt,
  };
}

async function getStudentCoupons(studentId, filters = {}) {
  await syncExpiredCoupons({ studentId });

  const where = {
    studentId,
    weeklyBooking: {
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
    },
  };

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters.mealType && filters.mealType !== 'ALL') {
    where.mealType = filters.mealType;
  }

  const coupons = await prisma.coupon.findMany({
    where,
    include: {
      student: { select: { id: true, fullName: true, studentId: true, email: true } },
      weeklyBooking: { select: { id: true, bookingCode: true, bookingType: true } },
      redeemedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
  });

  return coupons.map(formatCoupon);
}

function extractCouponCode(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.code === 'string' && parsed.code.trim()) {
        return parsed.code.trim().toUpperCase();
      }
    } catch {
      // Fallback to raw trimmed string
    }
  }
  return trimmed.toUpperCase();
}

async function verifyAndRedeemCoupon({
  couponInput,
  servingMealType,
  messUserId,
  now = new Date(),
}) {
  const couponCode = extractCouponCode(couponInput);
  if (!couponCode) {
    throw new ApiError(400, 'Please provide a valid coupon ID or QR code.');
  }

  const todayStr = formatDateStringIST(now);

  const coupon = await prisma.coupon.findUnique({
    where: { couponCode },
    include: {
      student: { select: { id: true, fullName: true, studentId: true, email: true } },
      weeklyBooking: {
        select: {
          id: true,
          bookingCode: true,
          bookingStatus: true,
          paymentStatus: true,
        },
      },
      redeemedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!coupon) {
    throw new ApiError(404, `Invalid coupon: "${couponCode}" does not exist.`);
  }

  if (
    coupon.weeklyBooking.bookingStatus !== 'CONFIRMED' ||
    coupon.weeklyBooking.paymentStatus !== 'PAID'
  ) {
    throw new ApiError(400, 'This coupon does not belong to a confirmed and paid booking.');
  }

  const couponDateStr = toDateStrFromUTCDate(coupon.mealDate);

  if (couponDateStr !== todayStr) {
    if (couponDateStr < todayStr && coupon.status === 'ACTIVE') {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { status: 'EXPIRED' },
      });
      throw new ApiError(
        400,
        `Coupon expired: This coupon was for ${couponDateStr} (${coupon.mealType}), whereas today is ${todayStr} (IST).`
      );
    }
    if (couponDateStr < todayStr) {
      throw new ApiError(
        400,
        `Coupon expired: Valid date ${couponDateStr} has passed (today is ${todayStr} IST).`
      );
    }
    throw new ApiError(
      400,
      `Coupon not valid today: This coupon is scheduled for ${couponDateStr} (${coupon.mealType}), whereas today is ${todayStr} (IST).`
    );
  }

  if (coupon.mealType !== servingMealType) {
    throw new ApiError(
      400,
      `Meal mismatch: This coupon is for ${coupon.mealType}, but currently serving ${servingMealType}.`
    );
  }

  if (coupon.status === 'REDEEMED') {
    const redeemedParts = coupon.redeemedAt ? getISTParts(coupon.redeemedAt) : null;
    const when = redeemedParts ? `${redeemedParts.dateStr} ${redeemedParts.timeStr} IST` : 'earlier';
    throw new ApiError(409, `Duplicate redemption blocked: Coupon was already redeemed at ${when}.`);
  }

  if (coupon.status === 'EXPIRED') {
    throw new ApiError(400, 'This coupon has expired and cannot be redeemed.');
  }

  // Atomic conditional redemption inside a transaction
  const updatedCoupon = await prisma.$transaction(async (tx) => {
    const updateRes = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        status: 'ACTIVE',
      },
      data: {
        status: 'REDEEMED',
        redeemedAt: now,
        redeemedById: messUserId,
      },
    });

    if (updateRes.count === 0) {
      throw new ApiError(409, 'Coupon has already been redeemed.');
    }

    return tx.coupon.findUnique({
      where: { id: coupon.id },
      include: {
        student: { select: { id: true, fullName: true, studentId: true, email: true } },
        weeklyBooking: { select: { id: true, bookingCode: true, bookingType: true } },
        redeemedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  });

  return formatCoupon(updatedCoupon);
}

async function getTodayRedemptions(now = new Date()) {
  const todayStr = formatDateStringIST(now);
  const todayDate = parseDateOnlyUTC(todayStr);

  const coupons = await prisma.coupon.findMany({
    where: {
      mealDate: todayDate,
      status: 'REDEEMED',
    },
    include: {
      student: { select: { id: true, fullName: true, studentId: true, email: true } },
      weeklyBooking: { select: { id: true, bookingCode: true, bookingType: true } },
      redeemedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { redeemedAt: 'desc' },
    take: 50,
  });

  return coupons.map(formatCoupon);
}

module.exports = {
  syncExpiredCoupons,
  formatCoupon,
  getStudentCoupons,
  extractCouponCode,
  verifyAndRedeemCoupon,
  getTodayRedemptions,
};
