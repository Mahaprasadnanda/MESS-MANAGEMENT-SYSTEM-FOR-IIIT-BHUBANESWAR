const asyncHandler = require('../utils/asyncHandler');
const bookingService = require('../services/bookingService');

const getBookingWindow = asyncHandler(async (req, res) => {
  const data = await bookingService.getStudentBookingWindow(req.user.id);
  res.status(200).json({
    success: true,
    data,
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const data = await bookingService.createBookingOrder({
    studentId: req.user.id,
    weekStartDate: req.validatedBody.weekStartDate,
    meals: req.validatedBody.meals,
  });

  res.status(201).json({
    success: true,
    message: 'Booking order initialized. Proceed to payment.',
    data,
  });
});

const getSameDayWindow = asyncHandler(async (req, res) => {
  const data = await bookingService.getStudentSameDayWindow(req.user.id);
  res.status(200).json({
    success: true,
    data,
  });
});

const createSameDayOrder = asyncHandler(async (req, res) => {
  const data = await bookingService.createSameDayBookingOrder({
    studentId: req.user.id,
    mealDate: req.validatedBody.mealDate,
    mealTypes: req.validatedBody.mealTypes,
  });

  res.status(201).json({
    success: true,
    message: 'Same-day meal order initialized. Proceed to payment.',
    data,
  });
});

const listBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getStudentBookings(req.user.id);
  res.status(200).json({
    success: true,
    data: { bookings },
  });
});

const getBookingDetails = asyncHandler(async (req, res) => {
  const booking = await bookingService.getStudentBookingById(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    data: { booking },
  });
});

module.exports = {
  getBookingWindow,
  createOrder,
  getSameDayWindow,
  createSameDayOrder,
  listBookings,
  getBookingDetails,
};
