const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/prisma');
const {
  formatDateStringIST,
  parseDateOnlyUTC,
  addDaysToDateStr,
} = require('../src/utils/dateIst');

function request(server, method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // Keep raw text (e.g. CSV)
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runE2E() {
  const server = app.listen(0);
  const testEmail = 'b999001@iiit-bh.ac.in';
  const testStudentId = 'B999001';

  try {
    // Ensure clean slate for test student
    await prisma.user.deleteMany({ where: { email: testEmail } });

    console.log('1. Testing Health Check...');
    const health = await request(server, 'GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');

    console.log('2. Testing Registration Validations...');
    const badGmail = await request(server, 'POST', '/api/auth/register', {
      fullName: 'External User',
      email: 'someone@gmail.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.strictEqual(badGmail.status, 400);

    const rejectedLegacyDomain = await request(server, 'POST', '/api/auth/register', {
      fullName: 'Old Domain Student',
      email: 'B123026@iiitbbs.ac.in',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.strictEqual(rejectedLegacyDomain.status, 400);

    const messReg = await request(server, 'POST', '/api/auth/register', {
      fullName: 'Fake Mess',
      email: 'mess@iiit-bh.ac.in',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.strictEqual(messReg.status, 403);

    const regOk = await request(server, 'POST', '/api/auth/register', {
      fullName: 'E2E Test Student',
      email: 'B999001@iiit-bh.ac.in',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.strictEqual(regOk.status, 201);
    assert.strictEqual(regOk.body.data.user.studentId, testStudentId);
    assert.strictEqual(regOk.body.data.user.role, 'STUDENT');
    assert.strictEqual(regOk.body.data.user.passwordHash, undefined);
    const studentToken = regOk.body.data.token;

    // Duplicate registration blocked
    const dupReg = await request(server, 'POST', '/api/auth/register', {
      fullName: 'E2E Test Student',
      email: 'b999001@iiit-bh.ac.in',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    assert.strictEqual(dupReg.status, 409);

    console.log('3. Testing Mess Login & Role Authorization...');
    const messLogin = await request(server, 'POST', '/api/auth/login', {
      email: process.env.MESS_EMAIL || 'mess@iiit-bh.ac.in',
      password: process.env.MESS_INITIAL_PASSWORD || 'mess1234',
    });
    assert.strictEqual(messLogin.status, 200);
    assert.strictEqual(messLogin.body.data.user.role, 'MESS');
    assert.strictEqual(messLogin.body.data.redirectTo, '/mess/dashboard');
    const messToken = messLogin.body.data.token;

    // Cross-role RBAC checks
    const studentHitsMess = await request(server, 'GET', '/api/mess/dashboard', null, studentToken);
    assert.strictEqual(studentHitsMess.status, 403);

    const messHitsStudent = await request(
      server,
      'GET',
      '/api/student/dashboard',
      null,
      messToken
    );
    assert.strictEqual(messHitsStudent.status, 403);

    const unauthHit = await request(server, 'GET', '/api/student/dashboard');
    assert.strictEqual(unauthHit.status, 401);

    console.log('4. Testing Weekly Booking Window & Authoritative Pricing...');
    const winResp = await request(server, 'GET', '/api/student/bookings/window', null, studentToken);
    assert.strictEqual(winResp.status, 200);
    const win = winResp.body.data.window;

    // Reject booking current week
    const currWeekFail = await request(
      server,
      'POST',
      '/api/student/bookings/create-order',
      {
        weekStartDate: win.currentWeekStartStr,
        meals: [{ mealDate: win.currentWeekStartStr, mealType: 'LUNCH' }],
      },
      studentToken
    );
    assert.strictEqual(currWeekFail.status, 400);

    // Reject order below ₹476 minimum (1 Breakfast + 1 Lunch + 1 Dinner = ₹120)
    const belowMinFail = await request(
      server,
      'POST',
      '/api/student/bookings/create-order',
      {
        weekStartDate: win.targetWeekStartStr,
        meals: [
          { mealDate: win.targetWeekDates[0], mealType: 'BREAKFAST' },
          { mealDate: win.targetWeekDates[0], mealType: 'LUNCH' },
          { mealDate: win.targetWeekDates[1], mealType: 'DINNER' },
        ],
      },
      studentToken
    );
    assert.strictEqual(belowMinFail.status, 400);
    assert.ok(String(belowMinFail.body.message).includes('476'));

    // Build qualifying selection: 4 days x 3 meals = 12 meals -> 4 * (20 + 55 + 45) = ₹480 (>= ₹476)
    const qualifyingMeals = win.targetWeekDates.slice(0, 4).flatMap((d) => [
      { mealDate: d, mealType: 'BREAKFAST' },
      { mealDate: d, mealType: 'LUNCH' },
      { mealDate: d, mealType: 'DINNER' },
    ]);

    const orderResp = await request(
      server,
      'POST',
      '/api/student/bookings/create-order',
      {
        weekStartDate: win.targetWeekStartStr,
        meals: qualifyingMeals,
      },
      studentToken
    );
    assert.strictEqual(orderResp.status, 201);
    assert.strictEqual(orderResp.body.data.order.amountRupees, 480);
    const { booking, payment, order } = orderResp.body.data;

    console.log('5. Testing Failed Payment Flow (No Coupons Generated)...');
    const failResp = await request(
      server,
      'POST',
      '/api/student/payments/fail',
      {
        bookingId: booking.id,
        paymentId: payment.id,
        reason: 'E2E simulated payment decline',
      },
      studentToken
    );
    assert.strictEqual(failResp.status, 200);

    const couponsAfterFail = await request(server, 'GET', '/api/student/coupons', null, studentToken);
    assert.strictEqual(couponsAfterFail.status, 200);
    assert.strictEqual(couponsAfterFail.body.data.coupons.length, 0);

    console.log('6. Testing Successful Payment Verification & Atomic Coupon Creation...');
    const retryOrder = await request(
      server,
      'POST',
      '/api/student/bookings/create-order',
      {
        weekStartDate: win.targetWeekStartStr,
        meals: qualifyingMeals,
      },
      studentToken
    );
    assert.strictEqual(retryOrder.status, 201);

    const retryOrderData = retryOrder.body.data;
    const simulatedPaymentId = `pay_e2e_${Date.now()}`;
    const validSignature =
      retryOrderData.paymentMode === 'RAZORPAY'
        ? crypto
            .createHmac('sha256', env.razorpayKeySecret)
            .update(`${retryOrderData.order.id}|${simulatedPaymentId}`)
            .digest('hex')
        : 'DEV_SIMULATED_SIGNATURE';

    // Ensure tampered signature is rejected with 400 and does NOT confirm booking
    const badSigResp = await request(
      server,
      'POST',
      '/api/student/payments/verify',
      {
        bookingId: retryOrderData.booking.id,
        paymentId: retryOrderData.payment.id,
        razorpay_order_id: retryOrderData.order.id,
        razorpay_payment_id: simulatedPaymentId,
        razorpay_signature: 'invalid_tampered_signature',
      },
      studentToken
    );
    assert.strictEqual(badSigResp.status, 400);

    // Create fresh pending payment attempt and verify with valid HMAC signature
    const finalOrder = await request(
      server,
      'POST',
      '/api/student/bookings/create-order',
      {
        weekStartDate: win.targetWeekStartStr,
        meals: qualifyingMeals,
      },
      studentToken
    );
    assert.strictEqual(finalOrder.status, 201);
    const finalOrderData = finalOrder.body.data;
    const finalPayId = `pay_e2e_ok_${Date.now()}`;
    const finalSig =
      finalOrderData.paymentMode === 'RAZORPAY'
        ? crypto
            .createHmac('sha256', env.razorpayKeySecret)
            .update(`${finalOrderData.order.id}|${finalPayId}`)
            .digest('hex')
        : 'DEV_SIMULATED_SIGNATURE';

    const verifyResp = await request(
      server,
      'POST',
      '/api/student/payments/verify',
      {
        bookingId: finalOrderData.booking.id,
        paymentId: finalOrderData.payment.id,
        razorpay_order_id: finalOrderData.order.id,
        razorpay_payment_id: finalPayId,
        razorpay_signature: finalSig,
      },
      studentToken
    );
    assert.strictEqual(verifyResp.status, 200);
    assert.strictEqual(verifyResp.body.data.booking.bookingStatus, 'CONFIRMED');
    assert.strictEqual(verifyResp.body.data.couponsCount, 12);

    // Duplicate weekly booking for same week must fail with 409 (using >= 476 qualifying payload)
    const dupBooking = await request(
      server,
      'POST',
      '/api/student/bookings/create-order',
      {
        weekStartDate: win.targetWeekStartStr,
        meals: qualifyingMeals,
      },
      studentToken
    );
    assert.strictEqual(dupBooking.status, 409);

    console.log('6B. Testing Same-Day Booking Flow (No ₹476 Min, Cutoffs & Pricing)...');
    const sdWinResp = await request(
      server,
      'GET',
      '/api/student/bookings/same-day/window',
      null,
      studentToken
    );
    assert.strictEqual(sdWinResp.status, 200);
    const sdWin = sdWinResp.body.data.sameDayWindow;
    assert.strictEqual(sdWin.slots.BREAKFAST.price, 25);
    assert.strictEqual(sdWin.slots.LUNCH.price, 65);
    assert.strictEqual(sdWin.slots.DINNER.price, 55);

    // Tomorrow's date rejected on same-day endpoint
    const sdWrongDate = await request(
      server,
      'POST',
      '/api/student/bookings/same-day/create-order',
      {
        mealDate: addDaysToDateStr(sdWin.todayStr, 1),
        mealTypes: ['DINNER'],
      },
      studentToken
    );
    assert.strictEqual(sdWrongDate.status, 400);

    const openSameDayTypes = ['BREAKFAST', 'LUNCH', 'DINNER'].filter(
      (t) => sdWin.slots[t].canBook
    );
    if (openSameDayTypes.length > 0) {
      const firstMeal = openSameDayTypes[0];
      const expectedFirstPrice = sdWin.slots[firstMeal].price;

      const sdOrder = await request(
        server,
        'POST',
        '/api/student/bookings/same-day/create-order',
        {
          mealDate: sdWin.todayStr,
          mealTypes: [firstMeal],
        },
        studentToken
      );
      assert.strictEqual(sdOrder.status, 201);
      assert.strictEqual(sdOrder.body.data.booking.bookingType, 'SAME_DAY');
      assert.strictEqual(sdOrder.body.data.order.amountRupees, expectedFirstPrice);

      const sdData = sdOrder.body.data;
      const sdPayId = `pay_e2e_sd_${Date.now()}`;
      const sdSig =
        sdData.paymentMode === 'RAZORPAY'
          ? crypto
              .createHmac('sha256', env.razorpayKeySecret)
              .update(`${sdData.order.id}|${sdPayId}`)
              .digest('hex')
          : 'DEV_SIMULATED_SIGNATURE';

      const sdVerify = await request(
        server,
        'POST',
        '/api/student/payments/verify',
        {
          bookingId: sdData.booking.id,
          paymentId: sdData.payment.id,
          razorpay_order_id: sdData.order.id,
          razorpay_payment_id: sdPayId,
          razorpay_signature: sdSig,
        },
        studentToken
      );
      assert.strictEqual(sdVerify.status, 200);
      assert.strictEqual(sdVerify.body.data.booking.bookingType, 'SAME_DAY');
      assert.strictEqual(sdVerify.body.data.couponsCount, 1);

      // Duplicate same-day booking of already booked meal fails with 409
      const sdDup = await request(
        server,
        'POST',
        '/api/student/bookings/same-day/create-order',
        {
          mealDate: sdWin.todayStr,
          mealTypes: [firstMeal],
        },
        studentToken
      );
      assert.strictEqual(sdDup.status, 409);

      // Second open meal on same day succeeds independently!
      if (openSameDayTypes.length > 1) {
        const secondMeal = openSameDayTypes[1];
        const sdOrder2 = await request(
          server,
          'POST',
          '/api/student/bookings/same-day/create-order',
          {
            mealDate: sdWin.todayStr,
            mealTypes: [secondMeal],
          },
          studentToken
        );
        assert.strictEqual(sdOrder2.status, 201);
        assert.strictEqual(sdOrder2.body.data.order.amountRupees, sdWin.slots[secondMeal].price);
      }

      // Immediately redeem the confirmed same-day coupon at mess desk!
      const sdCouponCode = sdVerify.body.data.booking.mealBookings[0].coupon.couponCode;
      const sdRedeem = await request(
        server,
        'POST',
        '/api/mess/coupons/verify',
        {
          couponInput: sdCouponCode,
          servingMealType: firstMeal,
        },
        messToken
      );
      assert.strictEqual(sdRedeem.status, 200);
      assert.strictEqual(sdRedeem.body.data.coupon.status, 'REDEEMED');
    } else {
      const closedResp = await request(
        server,
        'POST',
        '/api/student/bookings/same-day/create-order',
        { mealTypes: ['DINNER'] },
        studentToken
      );
      assert.strictEqual(closedResp.status, 400);
    }

    console.log('7. Testing Menu CRUD (Mess Create -> Student Read -> Mess Delete)...');
    const testDate = win.targetWeekDates[6]; // Sunday of next week (initially unpublished)
    const upsertMenu = await request(
      server,
      'PUT',
      '/api/mess/menu',
      {
        date: testDate,
        mealType: 'DINNER',
        description: 'E2E Special Dinner',
        items: [
          { name: 'Paneer Tikka', category: 'Special', isVeg: true },
          { name: 'Butter Naan', category: 'Staple', isVeg: true },
        ],
      },
      messToken
    );
    assert.strictEqual(upsertMenu.status, 200);
    const createdMenuId = upsertMenu.body.data.menu.id;

    const stuMenu = await request(
      server,
      'GET',
      `/api/student/menu/daily?date=${testDate}`,
      null,
      studentToken
    );
    assert.strictEqual(stuMenu.status, 200);
    assert.strictEqual(stuMenu.body.data.meals.DINNER.items[0].name, 'Paneer Tikka');

    const delMenu = await request(server, 'DELETE', `/api/mess/menu/${createdMenuId}`, null, messToken);
    assert.strictEqual(delMenu.status, 200);

    console.log('8. Testing Coupon Verification & Atomic Redemption Guard...');
    const couponsResp = await request(server, 'GET', '/api/student/coupons', null, studentToken);
    const futureCoupon = couponsResp.body.data.coupons.find(
      (c) => c.mealDate === win.targetWeekDates[0] && c.status === 'ACTIVE'
    );
    assert.ok(futureCoupon, 'Expected an active upcoming-week coupon');

    // Future date coupon cannot be redeemed today
    const futureRedeem = await request(
      server,
      'POST',
      '/api/mess/coupons/verify',
      {
        couponInput: futureCoupon.couponCode,
        servingMealType: futureCoupon.mealType,
      },
      messToken
    );
    assert.strictEqual(futureRedeem.status, 400);

    // Temporarily move one coupon's mealDate to today IST in DB to verify same-day redemption + duplicate prevention
    const todayDate = parseDateOnlyUTC(formatDateStringIST(new Date()));
    await prisma.coupon.update({
      where: { id: futureCoupon.id },
      data: { mealDate: todayDate },
    });

    // Wrong meal type rejected
    const wrongMeal = futureCoupon.mealType === 'LUNCH' ? 'DINNER' : 'LUNCH';
    const mismatchRedeem = await request(
      server,
      'POST',
      '/api/mess/coupons/verify',
      {
        couponInput: futureCoupon.qrPayload,
        servingMealType: wrongMeal,
      },
      messToken
    );
    assert.strictEqual(mismatchRedeem.status, 400);

    // Valid same-day + matching meal QR redemption succeeds
    const validRedeem = await request(
      server,
      'POST',
      '/api/mess/coupons/verify',
      {
        couponInput: futureCoupon.qrPayload,
        servingMealType: futureCoupon.mealType,
      },
      messToken
    );
    assert.strictEqual(validRedeem.status, 200);
    assert.strictEqual(validRedeem.body.data.coupon.status, 'REDEEMED');

    // Duplicate redemption blocked with 409
    const dupRedeem = await request(
      server,
      'POST',
      '/api/mess/coupons/verify',
      {
        couponInput: futureCoupon.couponCode,
        servingMealType: futureCoupon.mealType,
      },
      messToken
    );
    assert.strictEqual(dupRedeem.status, 409);

    console.log('9. Testing Mess Dashboard, Daily Overview & CSV Reports...');
    const messDash = await request(server, 'GET', '/api/mess/dashboard', null, messToken);
    assert.strictEqual(messDash.status, 200);
    assert.ok(messDash.body.data.summary.totalRevenue >= 480);

    const dailyOverview = await request(
      server,
      'GET',
      `/api/mess/bookings/daily?date=${win.targetWeekDates[0]}`,
      null,
      messToken
    );
    assert.strictEqual(dailyOverview.status, 200);
    assert.ok(dailyOverview.body.data.counts.BREAKFAST >= 1);

    const csvResp = await request(
      server,
      'GET',
      `/api/mess/reports/export?startDate=${win.targetWeekStartStr}&endDate=${win.targetWeekEndStr}&type=meals`,
      null,
      messToken
    );
    assert.strictEqual(csvResp.status, 200);
    assert.ok(String(csvResp.body).includes(testStudentId));

    // Clean up E2E test student
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log('ALL E2E WORKFLOW TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
