const prisma = require('../config/prisma');
const { MEAL_PRICES, SAME_DAY_MEAL_PRICES } = require('../utils/constants');
const {
  formatDateStringIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
  addDaysToDateStr,
  getBookingWindowIST,
  getWeekDates,
  getShortDayNameFromDateStr,
} = require('../utils/dateIst');

async function getMessDashboardData(now = new Date()) {
  const window = getBookingWindowIST(now);
  const todayStr = window.todayStr;
  const todayDate = parseDateOnlyUTC(todayStr);
  const targetWeekStartDate = parseDateOnlyUTC(window.targetWeekStartStr);

  const [
    totalStudents,
    todayMeals,
    todayRedeemedCounts,
    upcomingWeeklyBookingsCount,
    totalRevenueAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.mealBooking.groupBy({
      by: ['mealType'],
      where: {
        mealDate: todayDate,
        weeklyBooking: {
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
      },
      _count: { _all: true },
    }),
    prisma.coupon.groupBy({
      by: ['mealType'],
      where: {
        mealDate: todayDate,
        status: 'REDEEMED',
      },
      _count: { _all: true },
    }),
    prisma.weeklyBooking.count({
      where: {
        bookingType: 'WEEKLY',
        weekStartDate: targetWeekStartDate,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const todayCounts = { BREAKFAST: 0, LUNCH: 0, DINNER: 0 };
  for (const row of todayMeals) {
    todayCounts[row.mealType] = row._count._all;
  }

  const todayRedeemed = { BREAKFAST: 0, LUNCH: 0, DINNER: 0 };
  for (const row of todayRedeemedCounts) {
    todayRedeemed[row.mealType] = row._count._all;
  }

  // Daily Meal Booking Distribution (14-day window: current week Monday .. next week Sunday)
  const rangeStartStr = window.currentWeekStartStr;
  const rangeEndStr = window.targetWeekEndStr;
  const rangeMeals = await prisma.mealBooking.findMany({
    where: {
      mealDate: {
        gte: parseDateOnlyUTC(rangeStartStr),
        lte: parseDateOnlyUTC(rangeEndStr),
      },
      weeklyBooking: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    },
    select: {
      mealDate: true,
      mealType: true,
      price: true,
    },
  });

  const dailyMap = new Map();
  for (let i = 0; i < 14; i += 1) {
    const dStr = addDaysToDateStr(rangeStartStr, i);
    dailyMap.set(dStr, {
      date: dStr,
      label: `${getShortDayNameFromDateStr(dStr)} ${dStr.slice(5)}`,
      BREAKFAST: 0,
      LUNCH: 0,
      DINNER: 0,
      total: 0,
    });
  }

  for (const m of rangeMeals) {
    const dStr = toDateStrFromUTCDate(m.mealDate);
    const entry = dailyMap.get(dStr);
    if (entry) {
      entry[m.mealType] += 1;
      entry.total += 1;
    }
  }

  const dailyMealDistribution = Array.from(dailyMap.values());

  // Weekly Meal Demand (upcoming week Mon..Sun; fallback includes current week too)
  const nextWeekDates = new Set(getWeekDates(window.targetWeekStartStr));
  const weeklyMealDemand = dailyMealDistribution.filter((d) => nextWeekDates.has(d.date));

  // Overall Breakfast vs Lunch vs Dinner Distribution across all confirmed bookings
  const mealTypeGroups = await prisma.mealBooking.groupBy({
    by: ['mealType'],
    where: {
      weeklyBooking: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    },
    _count: { _all: true },
    _sum: { price: true },
  });

  const mealTypeMap = {
    BREAKFAST: { name: 'Breakfast', mealType: 'BREAKFAST', count: 0, revenue: 0 },
    LUNCH: { name: 'Lunch', mealType: 'LUNCH', count: 0, revenue: 0 },
    DINNER: { name: 'Dinner', mealType: 'DINNER', count: 0, revenue: 0 },
  };
  for (const row of mealTypeGroups) {
    mealTypeMap[row.mealType] = {
      name:
        row.mealType === 'BREAKFAST'
          ? 'Breakfast'
          : row.mealType === 'LUNCH'
            ? 'Lunch'
            : 'Dinner',
      mealType: row.mealType,
      count: row._count._all,
      revenue: Number(row._sum.price || 0),
    };
  }
  const mealTypeDistribution = [
    mealTypeMap.BREAKFAST,
    mealTypeMap.LUNCH,
    mealTypeMap.DINNER,
  ];

  // Weekly Revenue grouped by weekStartDate
  const confirmedWeeks = await prisma.weeklyBooking.groupBy({
    by: ['weekStartDate'],
    where: {
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
    },
    _sum: {
      totalAmount: true,
      totalMeals: true,
      breakfastCount: true,
      lunchCount: true,
      dinnerCount: true,
    },
    _count: { _all: true },
    orderBy: { weekStartDate: 'asc' },
  });

  const weeklyRevenue = confirmedWeeks.map((w) => {
    const startStr = toDateStrFromUTCDate(w.weekStartDate);
    return {
      weekStartDate: startStr,
      weekLabel: `Wk ${startStr.slice(5)}`,
      revenue: Number(w._sum.totalAmount || 0),
      bookingsCount: w._count._all,
      totalMeals: w._sum.totalMeals || 0,
      breakfastCount: w._sum.breakfastCount || 0,
      lunchCount: w._sum.lunchCount || 0,
      dinnerCount: w._sum.dinnerCount || 0,
    };
  });

  // Coupon utilization stats
  const couponStats = await prisma.coupon.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const couponStatusCounts = { ACTIVE: 0, REDEEMED: 0, EXPIRED: 0 };
  for (const c of couponStats) {
    couponStatusCounts[c.status] = c._count._all;
  }

  return {
    todayStr,
    bookingWindow: {
      currentWeekStartStr: window.currentWeekStartStr,
      currentWeekEndStr: window.currentWeekEndStr,
      targetWeekStartStr: window.targetWeekStartStr,
      targetWeekEndStr: window.targetWeekEndStr,
    },
    summary: {
      totalRegisteredStudents: totalStudents,
      todayBreakfastBookings: todayCounts.BREAKFAST,
      todayLunchBookings: todayCounts.LUNCH,
      todayDinnerBookings: todayCounts.DINNER,
      todayBreakfastRedeemed: todayRedeemed.BREAKFAST,
      todayLunchRedeemed: todayRedeemed.LUNCH,
      todayDinnerRedeemed: todayRedeemed.DINNER,
      upcomingWeeklyBookings: upcomingWeeklyBookingsCount,
      totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
      totalPaidTransactions: totalRevenueAgg._count._all,
    },
    couponStatusCounts,
    charts: {
      dailyMealDistribution,
      weeklyMealDemand,
      mealTypeDistribution,
      weeklyRevenue,
    },
    mealPrices: MEAL_PRICES,
    sameDayMealPrices: SAME_DAY_MEAL_PRICES,
  };
}

module.exports = {
  getMessDashboardData,
};
