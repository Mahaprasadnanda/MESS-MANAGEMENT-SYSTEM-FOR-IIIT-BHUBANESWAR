const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getMessDashboardData();
  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getDashboard,
};
