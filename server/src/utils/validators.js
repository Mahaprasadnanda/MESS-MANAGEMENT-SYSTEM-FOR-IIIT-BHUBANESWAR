const { z } = require('zod');
const { MEAL_TYPES } = require('./constants');

const INSTITUTIONAL_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@iiit-bh\.ac\.in$/i;
const DATE_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const passwordComplexitySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const institutionalEmailSchema = z
  .string()
  .trim()
  .min(1, 'Institutional email is required')
  .max(160, 'Email is too long')
  .refine((val) => INSTITUTIONAL_EMAIL_REGEX.test(val), {
    message: 'Only official @iiit-bh.ac.in institutional email addresses are allowed',
  })
  .transform((val) => val.toLowerCase());

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must not exceed 100 characters'),
    email: institutionalEmailSchema,
    password: passwordComplexitySchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

const loginSchema = z.object({
  email: institutionalEmailSchema,
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordComplexitySchema,
    confirmNewPassword: z.string().min(1, 'Confirm new password is required'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'New passwords do not match',
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });

const createBookingOrderSchema = z.object({
  weekStartDate: z.string().regex(DATE_STR_REGEX, 'Invalid weekStartDate (expected YYYY-MM-DD)'),
  meals: z
    .array(
      z.object({
        mealDate: z.string().regex(DATE_STR_REGEX, 'Invalid mealDate (expected YYYY-MM-DD)'),
        mealType: z.enum(MEAL_TYPES),
      })
    )
    .min(1, 'Please select at least one meal to book')
    .max(21, 'A weekly booking cannot exceed 21 meals'),
});

const createSameDayOrderSchema = z.object({
  mealDate: z.string().regex(DATE_STR_REGEX, 'Invalid mealDate (expected YYYY-MM-DD)').optional(),
  mealTypes: z
    .array(z.enum(MEAL_TYPES))
    .min(1, 'Please select at least one meal for today')
    .max(3, 'A same-day booking can include at most 3 meals'),
});

const verifyPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  paymentId: z.string().min(1, 'Payment record ID is required'),
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Payment signature is required'),
});

const failPaymentSchema = z.object({
  bookingId: z.string().min(1),
  paymentId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const menuUpsertSchema = z.object({
  date: z.string().regex(DATE_STR_REGEX, 'Invalid date (expected YYYY-MM-DD)'),
  mealType: z.enum(MEAL_TYPES),
  description: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Food item name is required').max(120),
        category: z.string().trim().max(50).optional().nullable(),
        isVeg: z.boolean().optional().default(true),
      })
    )
    .min(1, 'At least one food item is required'),
});

const verifyCouponSchema = z.object({
  couponInput: z.string().trim().min(1, 'Coupon code or QR data is required').max(1000),
  servingMealType: z.enum(MEAL_TYPES),
});

module.exports = {
  INSTITUTIONAL_EMAIL_REGEX,
  DATE_STR_REGEX,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  createBookingOrderSchema,
  createSameDayOrderSchema,
  verifyPaymentSchema,
  failPaymentSchema,
  menuUpsertSchema,
  verifyCouponSchema,
};
