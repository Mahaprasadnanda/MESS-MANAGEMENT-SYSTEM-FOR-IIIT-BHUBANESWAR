const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { DATE_STR_REGEX } = require('../utils/validators');
const reportService = require('../services/reportService');
const { formatDateStringIST } = require('../utils/dateIst');

const getDailyMealOverview = asyncHandler(async (req, res) => {
  const { date, mealType, search, redemptionStatus, page, limit } = req.query;
  if (date && !DATE_STR_REGEX.test(date)) {
    throw new ApiError(400, 'Invalid date query parameter (expected YYYY-MM-DD).');
  }

  const data = await reportService.getDailyMealOverview({
    dateStr: date || formatDateStringIST(new Date()),
    mealType,
    search,
    redemptionStatus,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getStudentBookings = asyncHandler(async (req, res) => {
  const { weekStartDate, status, search, page, limit } = req.query;
  if (weekStartDate && !DATE_STR_REGEX.test(weekStartDate)) {
    throw new ApiError(400, 'Invalid weekStartDate query parameter (expected YYYY-MM-DD).');
  }

  const data = await reportService.getMessStudentBookings({
    weekStartDate,
    status,
    search,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getDailyMealOverview,
  getStudentBookings,
};
