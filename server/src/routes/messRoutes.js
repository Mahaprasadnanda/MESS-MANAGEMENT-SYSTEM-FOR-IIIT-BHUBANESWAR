const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { menuUpsertSchema, verifyCouponSchema } = require('../utils/validators');

const messDashboardController = require('../controllers/messDashboardController');
const messMenuController = require('../controllers/messMenuController');
const messBookingController = require('../controllers/messBookingController');
const messCouponController = require('../controllers/messCouponController');
const messReportController = require('../controllers/messReportController');

const router = express.Router();

// Protect all mess routes strictly for MESS role
router.use(authenticate, authorizeRoles('MESS'));

// /api/mess/dashboard
router.get('/dashboard', messDashboardController.getDashboard);

// /api/mess/menu
router.get('/menu/weekly', messMenuController.getWeeklyMenu);
router.put('/menu', validateBody(menuUpsertSchema), messMenuController.upsertMenu);
router.post('/menu', validateBody(menuUpsertSchema), messMenuController.upsertMenu);
router.delete('/menu/:id', messMenuController.deleteMenu);

// /api/mess/bookings
router.get('/bookings/daily', messBookingController.getDailyMealOverview);
router.get('/bookings', messBookingController.getStudentBookings);

// /api/mess/coupons
router.get('/coupons/session', messCouponController.getVerificationSession);
router.post(
  '/coupons/verify',
  validateBody(verifyCouponSchema),
  messCouponController.verifyCoupon
);

// /api/mess/reports
router.get('/reports', messReportController.getReports);
router.get('/reports/export', messReportController.exportReportCsv);

module.exports = router;
