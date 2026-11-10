const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { DATE_STR_REGEX } = require('../utils/validators');
const reportService = require('../services/reportService');

const getReports = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (startDate && !DATE_STR_REGEX.test(startDate)) {
    throw new ApiError(400, 'Invalid startDate (expected YYYY-MM-DD).');
  }
  if (endDate && !DATE_STR_REGEX.test(endDate)) {
    throw new ApiError(400, 'Invalid endDate (expected YYYY-MM-DD).');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(400, 'Start date cannot be after end date.');
  }

  const data = await reportService.getReportsData({ startDate, endDate });
  res.status(200).json({
    success: true,
    data,
  });
});

const exportReportCsv = asyncHandler(async (req, res) => {
  const { startDate, endDate, type = 'meals' } = req.query;
  if (startDate && !DATE_STR_REGEX.test(startDate)) {
    throw new ApiError(400, 'Invalid startDate (expected YYYY-MM-DD).');
  }
  if (endDate && !DATE_STR_REGEX.test(endDate)) {
    throw new ApiError(400, 'Invalid endDate (expected YYYY-MM-DD).');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(400, 'Start date cannot be after end date.');
  }

  const { filename, csv } = await reportService.generateReportCsv({
    startDate,
    endDate,
    type,
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

module.exports = {
  getReports,
  exportReportCsv,
};
