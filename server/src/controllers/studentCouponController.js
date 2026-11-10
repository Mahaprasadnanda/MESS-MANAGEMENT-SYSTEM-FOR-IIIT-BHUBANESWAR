const asyncHandler = require('../utils/asyncHandler');
const couponService = require('../services/couponService');

const listMyCoupons = asyncHandler(async (req, res) => {
  const { status = 'ALL', mealType = 'ALL' } = req.query;
  const coupons = await couponService.getStudentCoupons(req.user.id, { status, mealType });
  res.status(200).json({
    success: true,
    data: { coupons },
  });
});

module.exports = {
  listMyCoupons,
};
