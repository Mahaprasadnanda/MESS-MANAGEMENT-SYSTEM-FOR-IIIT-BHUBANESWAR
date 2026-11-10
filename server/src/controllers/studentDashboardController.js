const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { MEAL_PRICES, SAME_DAY_MEAL_PRICES } = require('../utils/constants');
const {
  getBookingWindowIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
  getDayNameFromDateStr,
} = require('../utils/dateIst');
const { formatWeeklyBooking, getStudentSameDayWindow } = require('../services/bookingService');
const { getDailyMenu } = require('../services/menuService');
const { syncExpiredCoupons } = require('../services/couponService');

const getDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const now = new Date();
  const window = getBookingWindowIST(now);
  const todayDate = parseDateOnlyUTC(window.todayStr);

  await syncExpiredCoupons({ studentId }, now);

  const [
    confirmedBookingsAgg,
    paidPaymentsAgg,
    upcomingMeals,
    activeCouponsCount,
    recentBookings,
    todayMenu,
    nextWeekBooking,
    sameDayInfo,
  ] = await Promise.all([
    prisma.weeklyBooking.aggregate({
      where: {
        studentId,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
      _sum: { totalMeals: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: {
        studentId,
        status: 'PAID',
      },
      _sum: { amount: true },
    }),
    prisma.mealBooking.findMany({
      where: {
        mealDate: { gte: todayDate },
        weeklyBooking: {
          studentId,
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
      },
      include: {
        coupon: {
          select: {
            id: true,
            couponCode: true,
            status: true,
            qrPayload: true,
            redeemedAt: true,
          },
        },
      },
      orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
      take: 10,
    }),
    prisma.coupon.count({
      where: {
        studentId,
        status: 'ACTIVE',
        mealDate: { gte: todayDate },
        weeklyBooking: {
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
      },
    }),
    prisma.weeklyBooking.findMany({
      where: { studentId },
      include: {
        mealBookings: {
          orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ weekStartDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    getDailyMenu(window.todayStr),
    prisma.weeklyBooking.findUnique({
      where: {
        weeklySlotKey: `${studentId}|${window.targetWeekStartStr}`,
      },
      select: {
        id: true,
        bookingCode: true,
        bookingStatus: true,
        paymentStatus: true,
        totalMeals: true,
        totalAmount: true,
      },
    }),
    getStudentSameDayWindow(studentId, now),
  ]);

  res.status(200).json({
    success: true,
    data: {
      student: req.user,
      bookingWindow: window,
      sameDayWindow: sameDayInfo.sameDayWindow,
      mealPrices: MEAL_PRICES,
      sameDayMealPrices: SAME_DAY_MEAL_PRICES,
      nextWeekBookingStatus: nextWeekBooking
        ? {
            ...nextWeekBooking,
            totalAmount: Number(nextWeekBooking.totalAmount),
          }
        : null,
      summary: {
        upcomingBookedMealsCount: upcomingMeals.length,
        totalMealsBooked: confirmedBookingsAgg._sum.totalMeals || 0,
        totalConfirmedWeeks: confirmedBookingsAgg._count._all || 0,
        totalAmountPaid: Number(paidPaymentsAgg._sum.amount || 0),
        activeCouponsCount,
      },
      upcomingMeals: upcomingMeals.map((m) => {
        const dStr = toDateStrFromUTCDate(m.mealDate);
        return {
          id: m.id,
          mealDate: dStr,
          dayName: getDayNameFromDateStr(dStr),
          mealType: m.mealType,
          price: Number(m.price),
          coupon: m.coupon,
        };
      }),
      todayMenu,
      recentBookings: recentBookings.map(formatWeeklyBooking),
    },
  });
});

module.exports = {
  getDashboard,
};
