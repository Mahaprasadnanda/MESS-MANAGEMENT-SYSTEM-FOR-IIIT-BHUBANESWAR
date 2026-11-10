const asyncHandler = require('../utils/asyncHandler');
const couponService = require('../services/couponService');
const { formatDateStringIST, getSuggestedServingMealIST } = require('../utils/dateIst');

const getVerificationSession = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayRedemptions = await couponService.getTodayRedemptions(now);
  res.status(200).json({
    success: true,
    data: {
      todayStr: formatDateStringIST(now),
      suggestedMealType: getSuggestedServingMealIST(now),
      todayRedemptions,
    },
  });
});

const verifyCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.verifyAndRedeemCoupon({
    couponInput: req.validatedBody.couponInput,
    servingMealType: req.validatedBody.servingMealType,
    messUserId: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.couponCode} verified and redeemed for ${coupon.studentName} (${coupon.studentRollId}).`,
    data: { coupon },
  });
});

module.exports = {
  getVerificationSession,
  verifyCoupon,
};
