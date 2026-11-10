import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  Clock,
  Sparkles,
  Trash2,
  Check,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  CalendarRange,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentService } from '../../services/studentService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CountdownTimer } from '../../components/student/CountdownTimer';
import { DevPaymentSimulatorModal } from '../../components/student/PaymentCheckoutModal';
import { SameDayBookingPanel } from '../../components/student/SameDayBookingPanel';
import {
  MEAL_META,
  MEAL_PRICES,
  MEAL_TYPES,
  MIN_WEEKLY_BOOKING_AMOUNT,
} from '../../utils/constants';
import {
  formatDisplayDate,
  formatWeekRange,
  getDayNameFromDateStr,
} from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BookMealsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = searchParams.get('mode') === 'same-day' ? 'same-day' : 'weekly';

  const setBookingMode = (mode) => {
    setConfirmedResult(null);
    if (mode === 'same-day') {
      setSearchParams({ mode: 'same-day' });
    } else {
      setSearchParams({});
    }
  };

  const [windowData, setWindowData] = useState(null);
  const [sameDayData, setSameDayData] = useState(null);
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [selectedMeals, setSelectedMeals] = useState({}); // key: `${date}|${mealType}` -> true
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [devOrderData, setDevOrderData] = useState(null);
  const [confirmedResult, setConfirmedResult] = useState(null);

  const loadBookingState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, sameDay] = await Promise.all([
        studentService.getBookingWindow(),
        studentService.getSameDayWindow(),
      ]);
      setWindowData(data);
      setSameDayData(sameDay);

      // Load menu preview for target bookable week
      try {
        const menu = await studentService.getWeeklyMenu(data.window.targetWeekStartStr);
        setWeeklyMenu(menu);
      } catch {
        setWeeklyMenu(null);
      }

      // If student had an unpaid PENDING booking, pre-populate selections for convenience
      if (
        data.existingBooking &&
        data.existingBooking.bookingStatus === 'PENDING' &&
        data.existingBooking.mealBookings?.length
      ) {
        const prefilled = {};
        for (const m of data.existingBooking.mealBookings) {
          prefilled[`${m.mealDate}|${m.mealType}`] = true;
        }
        setSelectedMeals(prefilled);
      } else {
        setSelectedMeals({});
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to load meal booking portal.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookingState();
  }, [loadBookingState]);

  const menuLookup = useMemo(() => {
    const map = new Map();
    if (!weeklyMenu?.days) return map;
    for (const day of weeklyMenu.days) {
      for (const type of MEAL_TYPES) {
        if (day.meals[type]) {
          map.set(`${day.date}|${type}`, day.meals[type]);
        }
      }
    }
    return map;
  }, [weeklyMenu]);

  const summary = useMemo(() => {
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;
    const selectedList = [];

    for (const [key, isSelected] of Object.entries(selectedMeals)) {
      if (!isSelected) continue;
      const [mealDate, mealType] = key.split('|');
      selectedList.push({ mealDate, mealType });
      if (mealType === 'BREAKFAST') breakfastCount += 1;
      else if (mealType === 'LUNCH') lunchCount += 1;
      else if (mealType === 'DINNER') dinnerCount += 1;
    }

    const totalMeals = breakfastCount + lunchCount + dinnerCount;
    const breakfastAmount = breakfastCount * MEAL_PRICES.BREAKFAST;
    const lunchAmount = lunchCount * MEAL_PRICES.LUNCH;
    const dinnerAmount = dinnerCount * MEAL_PRICES.DINNER;
    const grandTotal = breakfastAmount + lunchAmount + dinnerAmount;

    return {
      breakfastCount,
      lunchCount,
      dinnerCount,
      breakfastAmount,
      lunchAmount,
      dinnerAmount,
      totalMeals,
      grandTotal,
      selectedList,
    };
  }, [selectedMeals]);

  const toggleMeal = (dateStr, mealType) => {
    const key = `${dateStr}|${mealType}`;
    setSelectedMeals((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const toggleDayAll = (dateStr) => {
    const allSelected = MEAL_TYPES.every((t) => selectedMeals[`${dateStr}|${t}`]);
    setSelectedMeals((prev) => {
      const next = { ...prev };
      for (const t of MEAL_TYPES) {
        const key = `${dateStr}|${t}`;
        if (allSelected) delete next[key];
        else next[key] = true;
      }
      return next;
    });
  };

  const selectAllWeek = () => {
    if (!windowData?.window?.targetWeekDates) return;
    const next = {};
    for (const d of windowData.window.targetWeekDates) {
      for (const t of MEAL_TYPES) {
        next[`${d}|${t}`] = true;
      }
    }
    setSelectedMeals(next);
  };

  const selectWeekdaysOnly = () => {
    if (!windowData?.window?.targetWeekDates) return;
    const next = {};
    windowData.window.targetWeekDates.slice(0, 5).forEach((d) => {
      for (const t of MEAL_TYPES) {
        next[`${d}|${t}`] = true;
      }
    });
    setSelectedMeals(next);
  };

  const clearAllSelections = () => {
    setSelectedMeals({});
  };

  const minAmount = windowData?.minBookingAmount ?? MIN_WEEKLY_BOOKING_AMOUNT;
  const amountLeft = Math.max(0, minAmount - summary.grandTotal);
  const meetsMinimum = summary.grandTotal >= minAmount;
  const progressPercent = Math.min(100, Math.round((summary.grandTotal / minAmount) * 100));

  const launchPaymentCheckout = async (orderResp, descriptionText) => {
    if (orderResp.paymentMode === 'RAZORPAY') {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
        setSubmitting(false);
        return;
      }

      let paymentHandled = false;

      const options = {
        key: orderResp.razorpayKeyId,
        amount: orderResp.order.amount,
        currency: orderResp.order.currency,
        name: 'IIIT Bhubaneswar Mess',
        description: descriptionText,
        order_id: orderResp.order.id,
        prefill: {
          ...orderResp.prefill,
          ...(orderResp.isRazorpayTestMode ? { contact: '9999999999' } : {}),
        },
        notes: {
          bookingCode: orderResp.booking.bookingCode,
          bookingType: orderResp.booking.bookingType || 'WEEKLY',
          mode: orderResp.isRazorpayTestMode ? 'TEST_NO_REAL_MONEY' : 'LIVE',
        },
        theme: { color: '#064e3b' },
        handler: async (response) => {
          paymentHandled = true;
          try {
            const verified = await studentService.verifyPayment({
              bookingId: orderResp.booking.id,
              paymentId: orderResp.payment.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment verified & meal coupons generated!');
            setConfirmedResult(verified);
            await loadBookingState();
          } catch (verErr) {
            toast.error(extractApiError(verErr, 'Payment verification failed.'));
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: async () => {
            if (paymentHandled) return;
            paymentHandled = true;
            try {
              await studentService.recordPaymentFailure({
                bookingId: orderResp.booking.id,
                paymentId: orderResp.payment.id,
                reason: 'Checkout dismissed by user before payment completion.',
              });
            } catch {
              // Non-fatal
            }
            toast.error('Payment cancelled. No coupons were generated.');
            setSubmitting(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (failResp) => {
        if (paymentHandled) return;
        paymentHandled = true;
        try {
          await studentService.recordPaymentFailure({
            bookingId: orderResp.booking.id,
            paymentId: orderResp.payment.id,
            reason: failResp.error?.description || 'Razorpay payment failed.',
          });
        } catch {
          // Non-fatal
        }
        toast.error(failResp.error?.description || 'Payment failed.');
        setSubmitting(false);
      });
      rzp.open();
    } else if (orderResp.paymentMode === 'DEV_SIMULATOR') {
      setDevOrderData(orderResp);
      setSubmitting(false);
    } else {
      toast.error('Payment gateway is not configured.');
      setSubmitting(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (summary.totalMeals === 0) {
      toast.error('Please select at least one meal before proceeding to payment.');
      return;
    }

    if (!meetsMinimum) {
      toast.error(
        `Minimum weekly booking amount is ₹${minAmount}. Please add meals worth ₹${amountLeft} more.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const orderResp = await studentService.createBookingOrder({
        weekStartDate: windowData.window.targetWeekStartStr,
        meals: summary.selectedList,
      });

      await launchPaymentCheckout(
        orderResp,
        `Weekly Meals (${formatWeekRange(
          windowData.window.targetWeekStartStr,
          windowData.window.targetWeekEndStr
        )})`
      );
    } catch (err) {
      toast.error(extractApiError(err, 'Unable to initialize meal booking order.'));
      setSubmitting(false);
    }
  };

  const handleDevSimSuccess = async () => {
    if (!devOrderData) return;
    try {
      const fakePaymentId = `pay_dev_${Date.now()}`;
      const verified = await studentService.verifyPayment({
        bookingId: devOrderData.booking.id,
        paymentId: devOrderData.payment.id,
        razorpay_order_id: devOrderData.order.id,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: 'DEV_SIMULATED_SIGNATURE',
      });
      setDevOrderData(null);
      setConfirmedResult(verified);
      toast.success('Payment verified! Digital meal coupons are ready.');
      await loadBookingState();
    } catch (err) {
      toast.error(extractApiError(err, 'Payment verification failed.'));
    }
  };

  const handleDevSimFailure = async () => {
    if (!devOrderData) return;
    try {
      await studentService.recordPaymentFailure({
        bookingId: devOrderData.booking.id,
        paymentId: devOrderData.payment.id,
        reason: 'Simulated payment failure in development mode.',
      });
      setDevOrderData(null);
      toast.error('Payment failed — status saved, no meal coupons generated.');
      await loadBookingState();
    } catch (err) {
      toast.error(extractApiError(err, 'Unable to record failed payment.'));
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadBookingState} />;
  if (!windowData) return null;

  const { window: win, existingBooking, paymentGatewayMode, isRazorpayTestMode } = windowData;
  const alreadyConfirmed =
    existingBooking &&
    existingBooking.bookingStatus === 'CONFIRMED' &&
    existingBooking.paymentStatus === 'PAID';
  const sameDayAvailableCount = sameDayData?.sameDayWindow?.availableCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Booking Mode Switcher: Same-Day Today vs Weekly Next Week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setBookingMode('same-day')}
          className={`text-left rounded-2xl border-2 p-4 sm:p-5 transition-all shadow-soft ${
            activeMode === 'same-day'
              ? 'border-brand-800 bg-white ring-2 ring-emerald-500/20'
              : 'border-slate-200/80 bg-white/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeMode === 'same-day'
                    ? 'bg-brand-900 text-white'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Same-Day Booking (Today)
                </div>
                <div className="text-xs text-slate-500">
                  {sameDayData?.sameDayWindow?.todayStr
                    ? formatDisplayDate(sameDayData.sameDayWindow.todayStr)
                    : 'Today IST'}
                </div>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                sameDayAvailableCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {sameDayAvailableCount > 0
                ? `${sameDayAvailableCount} open today`
                : 'Closed / Booked'}
            </span>
          </div>
          <div className="mt-3 text-[11px] font-medium text-slate-600">
            Breakfast <span className="font-mono font-bold">₹25</span> (&lt;6 AM) · Lunch{' '}
            <span className="font-mono font-bold">₹65</span> (&lt;10 AM) · Dinner{' '}
            <span className="font-mono font-bold">₹55</span> (&lt;5 PM)
          </div>
        </button>

        <button
          type="button"
          onClick={() => setBookingMode('weekly')}
          className={`text-left rounded-2xl border-2 p-4 sm:p-5 transition-all shadow-soft ${
            activeMode === 'weekly'
              ? 'border-brand-800 bg-white ring-2 ring-emerald-500/20'
              : 'border-slate-200/80 bg-white/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeMode === 'weekly'
                    ? 'bg-brand-900 text-white'
                    : 'bg-emerald-50 text-brand-800'
                }`}
              >
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Weekly Advance Booking (Next Week)
                </div>
                <div className="text-xs text-slate-500">
                  {formatWeekRange(win.targetWeekStartStr, win.targetWeekEndStr)}
                </div>
              </div>
            </div>
            {alreadyConfirmed ? (
              <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                Booked
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                Min ₹{minAmount}
              </span>
            )}
          </div>
          <div className="mt-3 text-[11px] font-medium text-slate-600">
            Breakfast <span className="font-mono font-bold">₹20</span> · Lunch{' '}
            <span className="font-mono font-bold">₹55</span> · Dinner{' '}
            <span className="font-mono font-bold">₹45</span> (Mon–Sun upcoming week)
          </div>
        </button>
      </div>

      {/* Instant Confirmation Banner after Payment */}
      {confirmedResult ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-brand-950">
                Booking Confirmed! ({confirmedResult.booking.bookingCode})
              </h3>
              <p className="text-xs sm:text-sm text-emerald-900/80 mt-0.5">
                {confirmedResult.couponsCount} digital QR meal coupon(s) generated and{' '}
                {formatINR(confirmedResult.payment.amount)} is verified.
              </p>
            </div>
          </div>
          <Link
            to="/student/coupons"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-800 shrink-0"
          >
            <QrCode className="h-4 w-4" />
            View My Coupons
          </Link>
        </div>
      ) : null}

      {activeMode === 'same-day' ? (
        <SameDayBookingPanel
          sameDayData={sameDayData}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onLaunchPayment={launchPaymentCheckout}
          onRefresh={loadBookingState}
        />
      ) : (
        <>
          {/* Booking Window & Strict Monday 12:00 AM IST Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-brand-950 via-brand-900 to-emerald-800 p-6 text-white shadow-card">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <span>Upcoming Week Booking Open</span>
                  <span>·</span>
                  <span>Asia/Kolkata (IST)</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight">
                  {formatWeekRange(win.targetWeekStartStr, win.targetWeekEndStr)}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-emerald-100/85">
                  Bookings are open exclusively for this Monday–Sunday week until{' '}
                  <span className="font-semibold text-white">{win.deadlineDisplay}</span>. At Monday
                  00:00:00 IST, booking for this week closes permanently.
                </p>
              </div>

              <div className="shrink-0 bg-white/10 border border-white/15 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-200 mb-2">
                  <Clock className="h-3.5 w-3.5" />
                  Time Remaining
                </div>
                <CountdownTimer closesAtISO={win.closesAtISO} onExpire={loadBookingState} />
              </div>
            </div>
          </div>

          {/* If student already booked & paid for this upcoming week */}
          {alreadyConfirmed ? (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-soft p-7 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-brand-900 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Upcoming Week Already Booked
                  </h3>
                  <StatusBadge status={existingBooking.bookingStatus} />
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Booking ID{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {existingBooking.bookingCode}
                  </span>{' '}
                  for {formatWeekRange(existingBooking.weekStartDate, existingBooking.weekEndDate)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/student/coupons"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-800 transition"
              >
                <QrCode className="h-4 w-4" />
                Open My Coupons
              </Link>
              <Link
                to="/student/bookings"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                View Booking History
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/70">
              <div className="text-xs text-slate-500">Breakfasts</div>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {existingBooking.breakfastCount}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/70">
              <div className="text-xs text-slate-500">Lunches</div>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {existingBooking.lunchCount}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/70">
              <div className="text-xs text-slate-500">Dinners</div>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {existingBooking.dinnerCount}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
              <div className="text-xs text-brand-800 font-semibold">Total Paid</div>
              <div className="mt-1 text-xl font-bold font-mono text-brand-900">
                {formatINR(existingBooking.totalAmount)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Interactive 7-Day Selection + Sticky Summary Panel */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Left 2 Cols: 7-Day Meal Selection */}
          <div className="xl:col-span-2 space-y-4">
            {existingBooking?.paymentStatus === 'FAILED' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Your previous payment attempt did not succeed, so no coupons were generated. You
                  can adjust your meals below and retry payment.
                </div>
              </div>
            ) : null}

            {/* Live Sticky Minimum ₹476 Progress Bar */}
            <div className="sticky top-[72px] z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 shadow-soft space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Selected Total:</span>
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    {formatINR(summary.grandTotal)}
                  </span>
                  <span className="text-slate-400">/ {formatINR(minAmount)} min</span>
                </div>
                {meetsMinimum ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Minimum ₹{minAmount} reached — Ready to pay
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-bold font-mono text-amber-900">
                    {formatINR(amountLeft)} left to reach {formatINR(minAmount)}
                  </span>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    meetsMinimum ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Bulk Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-soft flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-600">
                Quick Select ({formatWeekRange(win.targetWeekStartStr, win.targetWeekEndStr)}):
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllWeek}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-brand-900 hover:bg-emerald-100 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Select All 21 Meals
                </button>
                <button
                  type="button"
                  onClick={selectWeekdaysOnly}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Mon–Fri Only
                </button>
                <button
                  type="button"
                  onClick={clearAllSelections}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {/* 7 Day Cards */}
            {win.targetWeekDates.map((dateStr) => {
              const dayName = getDayNameFromDateStr(dateStr);
              const selectedDayCount = MEAL_TYPES.filter(
                (t) => selectedMeals[`${dateStr}|${t}`]
              ).length;
              const allDaySelected = selectedDayCount === 3;

              return (
                <div
                  key={dateStr}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm sm:text-base font-bold text-slate-900">
                        {dayName}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {formatDisplayDate(dateStr)}
                      </span>
                      {selectedDayCount > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-brand-900">
                          {selectedDayCount}/3 selected
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDayAll(dateStr)}
                      className="text-xs font-semibold text-brand-800 hover:text-brand-700"
                    >
                      {allDaySelected ? 'Deselect Day' : 'Select All Day'}
                    </button>
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {MEAL_TYPES.map((type) => {
                      const isSelected = Boolean(selectedMeals[`${dateStr}|${type}`]);
                      const meta = MEAL_META[type];
                      const menuPreview = menuLookup.get(`${dateStr}|${type}`);
                      const previewText = menuPreview?.items?.length
                        ? menuPreview.items
                            .slice(0, 2)
                            .map((i) => i.name)
                            .join(', ')
                        : 'Menu not published yet';

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleMeal(dateStr, type)}
                          className={`group relative text-left rounded-2xl border-2 p-4 transition-all ${
                            isSelected
                              ? 'border-brand-700 bg-emerald-50/70 shadow-sm'
                              : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {meta.label}
                              </span>
                              <div className="mt-1 text-lg font-extrabold font-mono text-slate-900">
                                ₹{meta.price}
                              </div>
                            </div>

                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center border transition ${
                                isSelected
                                  ? 'bg-brand-800 border-brand-800 text-white'
                                  : 'bg-white border-slate-300 text-transparent group-hover:border-slate-400'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500 line-clamp-1">
                            {previewText}
                          </div>
                          <div className="mt-1 text-[10px] font-medium text-slate-400">
                            {meta.timing}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Col: Sticky Booking Summary Panel */}
          <div className="xl:sticky xl:top-24 bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Booking Summary</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatWeekRange(win.targetWeekStartStr, win.targetWeekEndStr)}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Breakfast ({summary.breakfastCount} × ₹{MEAL_PRICES.BREAKFAST})
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatINR(summary.breakfastAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Lunch ({summary.lunchCount} × ₹{MEAL_PRICES.LUNCH})
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatINR(summary.lunchAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Dinner ({summary.dinnerCount} × ₹{MEAL_PRICES.DINNER})
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatINR(summary.dinnerAmount)}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Total Meals Selected</span>
                <span className="font-mono text-slate-900">{summary.totalMeals} / 21</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Minimum Required</span>
                <span className="font-mono text-slate-800">{formatINR(minAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">Grand Total</span>
                <span className="text-2xl font-extrabold font-mono text-brand-900">
                  {formatINR(summary.grandTotal)}
                </span>
              </div>
            </div>

            {/* Minimum Purchase Status Card */}
            <div
              className={`rounded-2xl border p-3.5 space-y-2 ${
                meetsMinimum
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-amber-50/80 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={meetsMinimum ? 'text-emerald-900' : 'text-amber-900'}>
                  {meetsMinimum ? 'Minimum Target Met' : 'Left to Reach Minimum'}
                </span>
                <span
                  className={`font-mono ${
                    meetsMinimum ? 'text-emerald-700' : 'text-amber-900'
                  }`}
                >
                  {meetsMinimum ? '₹0 left ✓' : `${formatINR(amountLeft)} left`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden border border-black/5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    meetsMinimum ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {!meetsMinimum ? (
                <p className="text-[11px] text-amber-800 leading-snug">
                  Select meals totaling at least{' '}
                  <span className="font-bold font-mono">{formatINR(minAmount)}</span> to unlock
                  payment.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!meetsMinimum || submitting}
              onClick={handleProceedToPayment}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-900 px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-brand-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-4 w-4" />
              {submitting
                ? 'Preparing Order…'
                : meetsMinimum
                  ? 'Proceed to Payment'
                  : `Add ${formatINR(amountLeft)} More to Proceed`}
            </button>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-start gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-800 shrink-0 mt-0.5" />
              <span>
                {paymentGatewayMode === 'RAZORPAY'
                  ? isRazorpayTestMode
                    ? 'Razorpay Test Mode active — No real money is moved. Payable total is calculated and verified server-side.'
                    : 'Razorpay Checkout active. Payable total is calculated and verified server-side.'
                  : 'Development Payment Simulator active (Razorpay Test keys unset). Server verifies all amounts authoritatively.'}
              </span>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      <DevPaymentSimulatorModal
        open={Boolean(devOrderData)}
        orderData={devOrderData}
        onSimulateSuccess={handleDevSimSuccess}
        onSimulateFailure={handleDevSimFailure}
        onClose={() => setDevOrderData(null)}
      />
    </div>
  );
}
