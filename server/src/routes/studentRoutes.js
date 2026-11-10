const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const {
  createBookingOrderSchema,
  createSameDayOrderSchema,
  verifyPaymentSchema,
  failPaymentSchema,
} = require('../utils/validators');

const studentDashboardController = require('../controllers/studentDashboardController');
const studentMenuController = require('../controllers/studentMenuController');
const studentBookingController = require('../controllers/studentBookingController');
const studentCouponController = require('../controllers/studentCouponController');
const studentPaymentController = require('../controllers/studentPaymentController');

const router = express.Router();

// Protect all student routes strictly for STUDENT role
router.use(authenticate, authorizeRoles('STUDENT'));

// /api/student/dashboard
router.get('/dashboard', studentDashboardController.getDashboard);

// /api/student/menu
router.get('/menu/weekly', studentMenuController.getWeeklyMenu);
router.get('/menu/daily', studentMenuController.getDailyMenu);

// /api/student/bookings
router.get('/bookings/window', studentBookingController.getBookingWindow);
router.post(
  '/bookings/create-order',
  validateBody(createBookingOrderSchema),
  studentBookingController.createOrder
);
router.get('/bookings/same-day/window', studentBookingController.getSameDayWindow);
router.post(
  '/bookings/same-day/create-order',
  validateBody(createSameDayOrderSchema),
  studentBookingController.createSameDayOrder
);
router.get('/bookings', studentBookingController.listBookings);
router.get('/bookings/:id', studentBookingController.getBookingDetails);

// /api/student/coupons
router.get('/coupons', studentCouponController.listMyCoupons);

// /api/student/payments
router.get('/payments', studentPaymentController.listMyPayments);
router.post(
  '/payments/verify',
  validateBody(verifyPaymentSchema),
  studentPaymentController.verifyPayment
);
router.post(
  '/payments/fail',
  validateBody(failPaymentSchema),
  studentPaymentController.recordPaymentFailure
);

module.exports = router;
