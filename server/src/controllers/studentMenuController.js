const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { DATE_STR_REGEX } = require('../utils/validators');
const menuService = require('../services/menuService');
const { formatDateStringIST } = require('../utils/dateIst');

const getWeeklyMenu = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (date && !DATE_STR_REGEX.test(date)) {
    throw new ApiError(400, 'Invalid date query parameter (expected YYYY-MM-DD).');
  }
  const menu = await menuService.getWeeklyMenu(date || formatDateStringIST(new Date()));
  res.status(200).json({
    success: true,
    data: menu,
  });
});

const getDailyMenu = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (date && !DATE_STR_REGEX.test(date)) {
    throw new ApiError(400, 'Invalid date query parameter (expected YYYY-MM-DD).');
  }
  const menu = await menuService.getDailyMenu(date || formatDateStringIST(new Date()));
  res.status(200).json({
    success: true,
    data: menu,
  });
});

module.exports = {
  getWeeklyMenu,
  getDailyMenu,
};
