const assert = require('assert');
const crypto = require('crypto');
const env = require('../src/config/env');
const { verifyRazorpaySignature } = require('../src/services/paymentService');
const {
  getBookingWindowIST,
  getSameDayBookingWindowIST,
  getWeekDates,
} = require('../src/utils/dateIst');
const {
  validateWeeklyBookingWindow,
  validateSameDayBookingSelection,
  computeAuthoritativeTotals,
} = require('../src/services/bookingService');
const {
  MIN_WEEKLY_BOOKING_AMOUNT,
  SAME_DAY_MEAL_PRICES,
} = require('../src/utils/constants');
const { registerSchema } = require('../src/utils/validators');

console.log('Running IIIT Bhubaneswar Mess Business Rule Unit Tests...');

// 1. Test Monday 2026-11-09 00:00:00 IST -> bookable week is 2026-11-16..2026-11-22
const monMorning = new Date('2026-11-09T00:00:00+05:30');
const winMon = getBookingWindowIST(monMorning);
assert.strictEqual(winMon.todayStr, '2026-11-09');
assert.strictEqual(winMon.currentWeekStartStr, '2026-11-09');
assert.strictEqual(winMon.targetWeekStartStr, '2026-11-16');
assert.strictEqual(winMon.targetWeekEndStr, '2026-11-22');
assert.strictEqual(winMon.isBookingOpen, true);

// 2. Test Sunday 2026-11-15 23:59:59 IST -> STILL bookable for 2026-11-16..2026-11-22
const sunLastSecond = new Date('2026-11-15T23:59:59+05:30');
const winSun = getBookingWindowIST(sunLastSecond);
assert.strictEqual(winSun.todayStr, '2026-11-15');
assert.strictEqual(winSun.targetWeekStartStr, '2026-11-16');
assert.strictEqual(winSun.targetWeekEndStr, '2026-11-22');
assert.strictEqual(winSun.isBookingOpen, true);

// 3. Test Monday 2026-11-16 00:00:00 IST -> 2026-11-16..2026-11-22 is CLOSED; target shifts to 2026-11-23..2026-11-29
const monCutoff = new Date('2026-11-16T00:00:00+05:30');
const winNextMon = getBookingWindowIST(monCutoff);
assert.strictEqual(winNextMon.todayStr, '2026-11-16');
assert.strictEqual(winNextMon.currentWeekStartStr, '2026-11-16');
assert.strictEqual(winNextMon.targetWeekStartStr, '2026-11-23');
assert.strictEqual(winNextMon.targetWeekEndStr, '2026-11-29');

// Reject booking Nov 16 week at Nov 16 00:00:00 IST
assert.throws(
  () =>
    validateWeeklyBookingWindow(
      '2026-11-16',
      [{ mealDate: '2026-11-16', mealType: 'LUNCH' }],
      monCutoff
    ),
  /Booking closed/
);

// Reject booking 2 weeks ahead (Nov 30)
assert.throws(
  () =>
    validateWeeklyBookingWindow(
      '2026-11-30',
      [{ mealDate: '2026-11-30', mealType: 'LUNCH' }],
      monCutoff
    ),
  /immediately upcoming week/
);

// Reject duplicate meals in payload
assert.throws(
  () =>
    validateWeeklyBookingWindow(
      '2026-11-23',
      [
        { mealDate: '2026-11-23', mealType: 'LUNCH' },
        { mealDate: '2026-11-23', mealType: 'LUNCH' },
      ],
      monCutoff
    ),
  /Duplicate meal selection/
);

// Valid booking at Sunday 23:59:59 IST succeeds validation
const validDates = getWeekDates('2026-11-16');
const validWin = validateWeeklyBookingWindow(
  '2026-11-16',
  [
    { mealDate: validDates[0], mealType: 'BREAKFAST' },
    { mealDate: validDates[0], mealType: 'LUNCH' },
    { mealDate: validDates[6], mealType: 'DINNER' },
  ],
  sunLastSecond
);
assert.strictEqual(validWin.targetWeekStartStr, '2026-11-16');

// 4. Test Authoritative Price Calculation (20, 55, 45)
const totals = computeAuthoritativeTotals([
  { mealDate: '2026-11-16', mealType: 'BREAKFAST' },
  { mealDate: '2026-11-16', mealType: 'LUNCH' },
  { mealDate: '2026-11-17', mealType: 'BREAKFAST' },
  { mealDate: '2026-11-17', mealType: 'DINNER' },
]);
assert.strictEqual(totals.breakfastCount, 2);
assert.strictEqual(totals.lunchCount, 1);
assert.strictEqual(totals.dinnerCount, 1);
assert.strictEqual(totals.totalMeals, 4);
assert.strictEqual(totals.totalAmount, 2 * 20 + 1 * 55 + 1 * 45); // 140
assert.strictEqual(MIN_WEEKLY_BOOKING_AMOUNT, 476);
assert.ok(totals.totalAmount < MIN_WEEKLY_BOOKING_AMOUNT);

// Full 4 days (12 meals) = 4 * (20 + 55 + 45) = 480 >= 476
const qualifyingMeals = [];
for (const d of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']) {
  qualifyingMeals.push(
    { mealDate: d, mealType: 'BREAKFAST' },
    { mealDate: d, mealType: 'LUNCH' },
    { mealDate: d, mealType: 'DINNER' }
  );
}
const qualifyingTotals = computeAuthoritativeTotals(qualifyingMeals);
assert.strictEqual(qualifyingTotals.totalMeals, 12);
assert.strictEqual(qualifyingTotals.totalAmount, 480);
assert.ok(qualifyingTotals.totalAmount >= MIN_WEEKLY_BOOKING_AMOUNT);

// 5. Test Institutional Email Validation (ONLY @iiit-bh.ac.in accepted; @iiitbbs.ac.in strictly rejected)
for (const okEmail of ['B123026@iiit-bh.ac.in', 'b123026@iiit-bh.ac.in']) {
  assert.strictEqual(
    registerSchema.safeParse({
      fullName: 'Aarav Behera',
      email: okEmail,
      password: 'Password1',
      confirmPassword: 'Password1',
    }).success,
    true,
    `Expected ${okEmail} to be accepted`
  );
}

for (const badEmail of [
  'B123026@iiitbbs.ac.in',
  'student@iiitbbs.ac.in',
  'student@gmail.com',
  'student@outlook.com',
  'student@yahoo.com',
  'student@fakeiiit-bh.ac.in',
  'student@fakeiiitbbs.ac.in',
  'student@sub.iiit-bh.ac.in',
  'student@sub.iiitbbs.ac.in',
  'student@gmail.com@iiit-bh.ac.in',
  'student@gmail.com@iiitbbs.ac.in',
]) {
  assert.strictEqual(
    registerSchema.safeParse({
      fullName: 'Test Student',
      email: badEmail,
      password: 'Password1',
      confirmPassword: 'Password1',
    }).success,
    false,
    `Expected ${badEmail} to be rejected`
  );
}

// 6. Test Razorpay Test-Mode HMAC-SHA256 Signature Verification (Key ID + Key Secret only)
const prevSecret = env.razorpayKeySecret;
env.razorpayKeySecret = 'test_secret_example_12345';
const testOrderId = 'order_Test123456';
const testPaymentId = 'pay_Test987654';
const validHmac = crypto
  .createHmac('sha256', env.razorpayKeySecret)
  .update(`${testOrderId}|${testPaymentId}`)
  .digest('hex');
assert.strictEqual(verifyRazorpaySignature(testOrderId, testPaymentId, validHmac), true);
assert.strictEqual(verifyRazorpaySignature(testOrderId, testPaymentId, 'tampered_sig'), false);
env.razorpayKeySecret = prevSecret;

// 7. Test Same-Day Booking Pricing (25/65/55) & Exact IST Cutoffs (6 AM / 10 AM / 5 PM)
assert.strictEqual(SAME_DAY_MEAL_PRICES.BREAKFAST, 25);
assert.strictEqual(SAME_DAY_MEAL_PRICES.LUNCH, 65);
assert.strictEqual(SAME_DAY_MEAL_PRICES.DINNER, 55);

const before6Am = new Date('2026-11-10T05:59:59+05:30');
const sdBefore6 = getSameDayBookingWindowIST(before6Am);
assert.strictEqual(sdBefore6.slots.BREAKFAST.isWindowOpen, true);
assert.strictEqual(sdBefore6.slots.LUNCH.isWindowOpen, true);
assert.strictEqual(sdBefore6.slots.DINNER.isWindowOpen, true);
assert.doesNotThrow(() =>
  validateSameDayBookingSelection('2026-11-10', ['BREAKFAST', 'LUNCH', 'DINNER'], before6Am)
);

const at6Am = new Date('2026-11-10T06:00:00+05:30');
const sdAt6 = getSameDayBookingWindowIST(at6Am);
assert.strictEqual(sdAt6.slots.BREAKFAST.isWindowOpen, false);
assert.strictEqual(sdAt6.slots.LUNCH.isWindowOpen, true);
assert.strictEqual(sdAt6.slots.DINNER.isWindowOpen, true);
assert.throws(
  () => validateSameDayBookingSelection('2026-11-10', ['BREAKFAST'], at6Am),
  /cutoff passed/
);

const before10Am = new Date('2026-11-10T09:59:59+05:30');
assert.strictEqual(getSameDayBookingWindowIST(before10Am).slots.LUNCH.isWindowOpen, true);

const at10Am = new Date('2026-11-10T10:00:00+05:30');
assert.strictEqual(getSameDayBookingWindowIST(at10Am).slots.LUNCH.isWindowOpen, false);
assert.strictEqual(getSameDayBookingWindowIST(at10Am).slots.DINNER.isWindowOpen, true);
assert.throws(
  () => validateSameDayBookingSelection('2026-11-10', ['LUNCH'], at10Am),
  /cutoff passed/
);

const before5Pm = new Date('2026-11-10T16:59:59+05:30');
assert.strictEqual(getSameDayBookingWindowIST(before5Pm).slots.DINNER.isWindowOpen, true);
assert.doesNotThrow(() =>
  validateSameDayBookingSelection('2026-11-10', ['DINNER'], before5Pm)
);

const at5Pm = new Date('2026-11-10T17:00:00+05:30');
assert.strictEqual(getSameDayBookingWindowIST(at5Pm).slots.DINNER.isWindowOpen, false);
assert.strictEqual(getSameDayBookingWindowIST(at5Pm).anySlotOpen, false);
assert.throws(
  () => validateSameDayBookingSelection('2026-11-10', ['DINNER'], at5Pm),
  /cutoff passed/
);

// Reject non-today dates in same-day validation
assert.throws(
  () => validateSameDayBookingSelection('2026-11-11', ['DINNER'], before5Pm),
  /strictly for today/
);

// Authoritative same-day total calculation (no ₹476 minimum!)
const sameDayTotals = computeAuthoritativeTotals(
  [
    { mealDate: '2026-11-10', mealType: 'BREAKFAST' },
    { mealDate: '2026-11-10', mealType: 'LUNCH' },
    { mealDate: '2026-11-10', mealType: 'DINNER' },
  ],
  SAME_DAY_MEAL_PRICES
);
assert.strictEqual(sameDayTotals.totalMeals, 3);
assert.strictEqual(sameDayTotals.totalAmount, 25 + 65 + 55); // 145

console.log('All business rule unit tests PASSED!');
