const prisma = require('../config/prisma');
const {
  formatDateStringIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
  addDaysToDateStr,
} = require('../utils/dateIst');
const { buildCsv } = require('../utils/csv');
const { syncExpiredCoupons } = require('./couponService');

async function getDailyMealOverview({
  dateStr,
  mealType = 'ALL',
  search = '',
  redemptionStatus = 'ALL',
  page = 1,
  limit = 15,
}) {
  const targetDateStr = dateStr || formatDateStringIST(new Date());
  const targetDate = parseDateOnlyUTC(targetDateStr);

  await syncExpiredCoupons({ mealDate: targetDate });

  // Counts strictly for confirmed & paid bookings
  const countGroups = await prisma.mealBooking.groupBy({
    by: ['mealType'],
    where: {
      mealDate: targetDate,
      weeklyBooking: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    },
    _count: { _all: true },
  });

  const counts = { BREAKFAST: 0, LUNCH: 0, DINNER: 0, total: 0 };
  for (const row of countGroups) {
    counts[row.mealType] = row._count._all;
    counts.total += row._count._all;
  }

  const where = {
    mealDate: targetDate,
    weeklyBooking: {
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
    },
  };

  if (mealType && mealType !== 'ALL') {
    where.mealType = mealType;
  }

  if (redemptionStatus && redemptionStatus !== 'ALL') {
    where.coupon = { status: redemptionStatus };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { weeklyBooking: { student: { fullName: { contains: q, mode: 'insensitive' } } } },
      { weeklyBooking: { student: { studentId: { contains: q, mode: 'insensitive' } } } },
      { weeklyBooking: { student: { email: { contains: q, mode: 'insensitive' } } } },
      { coupon: { couponCode: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 15));
  const skip = (safePage - 1) * safeLimit;

  const [totalRecords, rows] = await Promise.all([
    prisma.mealBooking.count({ where }),
    prisma.mealBooking.findMany({
      where,
      include: {
        weeklyBooking: {
          select: {
            id: true,
            bookingCode: true,
            bookingType: true,
            paymentStatus: true,
            bookingStatus: true,
            student: {
              select: {
                id: true,
                fullName: true,
                studentId: true,
                email: true,
              },
            },
          },
        },
        coupon: {
          select: {
            id: true,
            couponCode: true,
            status: true,
            redeemedAt: true,
          },
        },
      },
      orderBy: [
        { mealType: 'asc' },
        { weeklyBooking: { student: { studentId: 'asc' } } },
      ],
      skip,
      take: safeLimit,
    }),
  ]);

  const students = rows.map((r) => ({
    id: r.id,
    bookingId: r.weeklyBooking.id,
    bookingCode: r.weeklyBooking.bookingCode,
    bookingType: r.weeklyBooking.bookingType || 'WEEKLY',
    studentName: r.weeklyBooking.student.fullName,
    studentId: r.weeklyBooking.student.studentId,
    institutionalEmail: r.weeklyBooking.student.email,
    mealDate: toDateStrFromUTCDate(r.mealDate),
    mealType: r.mealType,
    price: Number(r.price),
    couponId: r.coupon?.couponCode || 'N/A',
    paymentStatus: r.weeklyBooking.paymentStatus,
    redemptionStatus: r.coupon?.status || 'PENDING',
    redeemedAt: r.coupon?.redeemedAt || null,
  }));

  return {
    date: targetDateStr,
    counts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / safeLimit)),
    },
    students,
  };
}

async function getMessStudentBookings({
  weekStartDate = '',
  status = 'ALL',
  search = '',
  page = 1,
  limit = 15,
}) {
  const where = {};
  if (weekStartDate) {
    where.weekStartDate = parseDateOnlyUTC(weekStartDate);
  }
  if (status && status !== 'ALL') {
    where.bookingStatus = status;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { bookingCode: { contains: q, mode: 'insensitive' } },
      { student: { fullName: { contains: q, mode: 'insensitive' } } },
      { student: { studentId: { contains: q, mode: 'insensitive' } } },
      { student: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 15));
  const skip = (safePage - 1) * safeLimit;

  const [total, bookings, distinctWeeks] = await Promise.all([
    prisma.weeklyBooking.count({ where }),
    prisma.weeklyBooking.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, studentId: true, email: true },
        },
        mealBookings: {
          orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
          include: {
            coupon: {
              select: { id: true, couponCode: true, status: true, redeemedAt: true },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ weekStartDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: safeLimit,
    }),
    prisma.weeklyBooking.findMany({
      distinct: ['weekStartDate'],
      select: { weekStartDate: true, weekEndDate: true },
      orderBy: { weekStartDate: 'desc' },
    }),
  ]);

  return {
    availableWeeks: distinctWeeks.map((w) => ({
      weekStartDate: toDateStrFromUTCDate(w.weekStartDate),
      weekEndDate: toDateStrFromUTCDate(w.weekEndDate),
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      bookingType: b.bookingType || 'WEEKLY',
      sameDayDate: b.sameDayDate ? toDateStrFromUTCDate(b.sameDayDate) : null,
      student: b.student,
      weekStartDate: toDateStrFromUTCDate(b.weekStartDate),
      weekEndDate: toDateStrFromUTCDate(b.weekEndDate),
      breakfastCount: b.breakfastCount,
      lunchCount: b.lunchCount,
      dinnerCount: b.dinnerCount,
      totalMeals: b.totalMeals,
      totalAmount: Number(b.totalAmount),
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      latestPayment: b.payments[0]
        ? {
            transactionId: b.payments[0].transactionId || b.payments[0].razorpayOrderId,
            status: b.payments[0].status,
            paidAt: b.payments[0].paidAt,
          }
        : null,
      mealBookings: b.mealBookings.map((m) => ({
        id: m.id,
        mealDate: toDateStrFromUTCDate(m.mealDate),
        mealType: m.mealType,
        price: Number(m.price),
        couponCode: m.coupon?.couponCode || null,
        couponStatus: m.coupon?.status || null,
        redeemedAt: m.coupon?.redeemedAt || null,
      })),
      createdAt: b.createdAt,
    })),
  };
}

async function getReportsData({ startDate, endDate }) {
  const todayStr = formatDateStringIST(new Date());
  const defaultStart = addDaysToDateStr(todayStr, -6);
  const defaultEnd = addDaysToDateStr(todayStr, 14);

  const rangeStartStr = startDate || defaultStart;
  const rangeEndStr = endDate || defaultEnd;

  const startObj = parseDateOnlyUTC(rangeStartStr);
  const endObj = parseDateOnlyUTC(rangeEndStr);

  // Meals inside selected date range (paid & confirmed only)
  const mealRows = await prisma.mealBooking.findMany({
    where: {
      mealDate: { gte: startObj, lte: endObj },
      weeklyBooking: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    },
    include: {
      weeklyBooking: {
        select: {
          bookingCode: true,
          paymentStatus: true,
          bookingStatus: true,
          student: { select: { fullName: true, studentId: true, email: true } },
        },
      },
      coupon: {
        select: { couponCode: true, status: true, redeemedAt: true },
      },
    },
    orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
  });

  const mealCounts = { BREAKFAST: 0, LUNCH: 0, DINNER: 0, total: 0, mealRevenue: 0 };
  const studentMap = new Map();

  for (const row of mealRows) {
    mealCounts[row.mealType] += 1;
    mealCounts.total += 1;
    mealCounts.mealRevenue += Number(row.price);

    const sKey = row.weeklyBooking.student.email;
    if (!studentMap.has(sKey)) {
      studentMap.set(sKey, {
        studentName: row.weeklyBooking.student.fullName,
        studentId: row.weeklyBooking.student.studentId,
        email: row.weeklyBooking.student.email,
        breakfastCount: 0,
        lunchCount: 0,
        dinnerCount: 0,
        totalMeals: 0,
        totalSpent: 0,
      });
    }
    const agg = studentMap.get(sKey);
    if (row.mealType === 'BREAKFAST') agg.breakfastCount += 1;
    if (row.mealType === 'LUNCH') agg.lunchCount += 1;
    if (row.mealType === 'DINNER') agg.dinnerCount += 1;
    agg.totalMeals += 1;
    agg.totalSpent += Number(row.price);
  }

  // Payments made in date range (inclusive end of day IST)
  const paymentsStartUtc = new Date(startObj.getTime() - 330 * 60 * 1000);
  const paymentsEndUtc = new Date(endObj.getTime() + 24 * 60 * 60 * 1000 - 330 * 60 * 1000 - 1);

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: paymentsStartUtc, lte: paymentsEndUtc },
    },
    include: {
      student: { select: { fullName: true, studentId: true, email: true } },
      weeklyBooking: { select: { bookingCode: true, weekStartDate: true, weekEndDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let paidRevenue = 0;
  let paidCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  const paymentRecords = payments.map((p) => {
    const amt = Number(p.amount);
    if (p.status === 'PAID') {
      paidRevenue += amt;
      paidCount += 1;
    } else if (p.status === 'FAILED') {
      failedCount += 1;
    } else if (p.status === 'PENDING') {
      pendingCount += 1;
    }
    return {
      id: p.id,
      transactionId: p.transactionId || p.razorpayOrderId || p.id,
      bookingCode: p.weeklyBooking.bookingCode,
      weekRange: `${toDateStrFromUTCDate(p.weeklyBooking.weekStartDate)} to ${toDateStrFromUTCDate(p.weeklyBooking.weekEndDate)}`,
      studentName: p.student.fullName,
      studentId: p.student.studentId,
      email: p.student.email,
      amount: amt,
      provider: p.provider,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    };
  });

  const mealDetails = mealRows.map((r) => ({
    mealDate: toDateStrFromUTCDate(r.mealDate),
    mealType: r.mealType,
    price: Number(r.price),
    bookingCode: r.weeklyBooking.bookingCode,
    studentName: r.weeklyBooking.student.fullName,
    studentId: r.weeklyBooking.student.studentId,
    email: r.weeklyBooking.student.email,
    couponCode: r.coupon?.couponCode || '',
    redemptionStatus: r.coupon?.status || 'ACTIVE',
    paymentStatus: r.weeklyBooking.paymentStatus,
  }));

  return {
    startDate: rangeStartStr,
    endDate: rangeEndStr,
    mealCounts,
    paymentSummary: {
      totalTransactions: payments.length,
      paidCount,
      failedCount,
      pendingCount,
      paidRevenue,
    },
    studentSummaries: Array.from(studentMap.values()).sort((a, b) =>
      (a.studentId || '').localeCompare(b.studentId || '')
    ),
    mealDetails,
    paymentRecords,
  };
}

async function generateReportCsv({ startDate, endDate, type = 'meals' }) {
  const report = await getReportsData({ startDate, endDate });

  if (type === 'payments') {
    const headers = [
      { key: 'transactionId', label: 'Transaction ID' },
      { key: 'bookingCode', label: 'Booking ID' },
      { key: 'weekRange', label: 'Booking Week' },
      { key: 'studentId', label: 'Student ID' },
      { key: 'studentName', label: 'Student Name' },
      { key: 'email', label: 'Institutional Email' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'provider', label: 'Gateway' },
      { key: 'status', label: 'Payment Status' },
      { key: 'paidAt', label: 'Paid At' },
      { key: 'createdAt', label: 'Created At' },
    ];
    return {
      filename: `iiitbbs-mess-payments-${report.startDate}-to-${report.endDate}.csv`,
      csv: buildCsv(headers, report.paymentRecords),
    };
  }

  if (type === 'students') {
    const headers = [
      { key: 'studentId', label: 'Student ID' },
      { key: 'studentName', label: 'Student Name' },
      { key: 'email', label: 'Institutional Email' },
      { key: 'breakfastCount', label: 'Breakfasts' },
      { key: 'lunchCount', label: 'Lunches' },
      { key: 'dinnerCount', label: 'Dinners' },
      { key: 'totalMeals', label: 'Total Meals' },
      { key: 'totalSpent', label: 'Total Amount (INR)' },
    ];
    return {
      filename: `iiitbbs-mess-student-summary-${report.startDate}-to-${report.endDate}.csv`,
      csv: buildCsv(headers, report.studentSummaries),
    };
  }

  const headers = [
    { key: 'mealDate', label: 'Meal Date' },
    { key: 'mealType', label: 'Meal Type' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'email', label: 'Institutional Email' },
    { key: 'bookingCode', label: 'Booking ID' },
    { key: 'couponCode', label: 'Coupon ID' },
    { key: 'price', label: 'Price (INR)' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'redemptionStatus', label: 'Redemption Status' },
  ];
  return {
    filename: `iiitbbs-mess-meal-bookings-${report.startDate}-to-${report.endDate}.csv`,
    csv: buildCsv(headers, report.mealDetails),
  };
}

module.exports = {
  getDailyMealOverview,
  getMessStudentBookings,
  getReportsData,
  generateReportCsv,
};
