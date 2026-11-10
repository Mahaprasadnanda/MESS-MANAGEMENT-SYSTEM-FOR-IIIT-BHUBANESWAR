import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Coffee,
  Utensils,
  Moon,
  Clock,
  Check,
  CheckCircle2,
  Lock,
  CreditCard,
  ShieldCheck,
  QrCode,
  Sparkles,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCountdown } from '../../hooks/useCountdown';
import { studentService } from '../../services/studentService';
import { StatusBadge } from '../common/StatusBadge';
import { MEAL_META, MEAL_TYPES, SAME_DAY_MEAL_PRICES } from '../../utils/constants';
import { formatDisplayDate } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

const MEAL_ICONS = {
  BREAKFAST: Coffee,
  LUNCH: Utensils,
  DINNER: Moon,
};

function CutoffCountdownPill({ slot, onExpire }) {
  const { hours, minutes, seconds, expired } = useCountdown(
    slot.isWindowOpen ? slot.closesAtISO : null,
    slot.isWindowOpen ? onExpire : undefined
  );

  if (slot.alreadyBooked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
        Booked ({slot.bookedSource === 'WEEKLY' ? 'Weekly Pass' : 'Same-Day'})
      </span>
    );
  }

  if (!slot.isWindowOpen || expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
        <Lock className="h-3 w-3" />
        Closed ({slot.cutoffDisplay})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold font-mono text-amber-900">
      <Clock className="h-3 w-3 text-amber-600" />
      {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m{' '}
      {String(seconds).padStart(2, '0')}s left
    </span>
  );
}

export function SameDayBookingPanel({
  sameDayData,
  submitting,
  setSubmitting,
  onLaunchPayment,
  onRefresh,
}) {
  const [selectedMeals, setSelectedMeals] = useState({});

  const slots = sameDayData?.sameDayWindow?.slots || {};
  const todayStr = sameDayData?.sameDayWindow?.todayStr;
  const todayMenu = sameDayData?.todayMenu;
  const paymentGatewayMode = sameDayData?.paymentGatewayMode;
  const isRazorpayTestMode = sameDayData?.isRazorpayTestMode;

  // Clear selections if a slot becomes closed or already booked after reload
  useEffect(() => {
    setSelectedMeals((prev) => {
      const next = {};
      for (const t of MEAL_TYPES) {
        if (prev[t] && slots[t]?.canBook) {
          next[t] = true;
        }
      }
      return next;
    });
  }, [sameDayData]);

  const toggleMeal = (mealType) => {
    if (!slots[mealType]?.canBook) return;
    setSelectedMeals((prev) => ({
      ...prev,
      [mealType]: !prev[mealType],
    }));
  };

  const selectAllOpen = () => {
    const next = {};
    for (const t of MEAL_TYPES) {
      if (slots[t]?.canBook) next[t] = true;
    }
    setSelectedMeals(next);
  };

  const summary = useMemo(() => {
    const mealTypes = MEAL_TYPES.filter((t) => selectedMeals[t] && slots[t]?.canBook);
    const grandTotal = mealTypes.reduce(
      (sum, t) => sum + (slots[t]?.price ?? SAME_DAY_MEAL_PRICES[t]),
      0
    );
    return {
      mealTypes,
      totalMeals: mealTypes.length,
      grandTotal,
    };
  }, [selectedMeals, slots]);

  const openBookableCount = MEAL_TYPES.filter((t) => slots[t]?.canBook).length;

  const handleProceedSameDay = async () => {
    if (summary.totalMeals === 0) {
      toast.error('Please select at least one open meal for today.');
      return;
    }

    setSubmitting(true);
    try {
      const orderResp = await studentService.createSameDayOrder({
        mealDate: todayStr,
        mealTypes: summary.mealTypes,
      });

      await onLaunchPayment(
        orderResp,
        `Same-Day Meals (${formatDisplayDate(todayStr, false)})`
      );
    } catch (err) {
      toast.error(extractApiError(err, 'Unable to start same-day meal booking.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Same-Day Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-emerald-900 p-6 text-white shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-300/30 px-3 py-1 text-xs font-semibold text-amber-200">
              <Zap className="h-3.5 w-3.5" />
              <span>Same-Day Instant Booking</span>
              <span>·</span>
              <span>Asia/Kolkata (IST)</span>
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight">
              Today&apos;s Meals · {formatDisplayDate(todayStr)}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/85">
              Book individual meals for today before their strict IST cutoffs. Instant QR coupon issued immediately upon payment — no ₹476 minimum applies.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0 text-center">
            {MEAL_TYPES.map((t) => {
              const s = slots[t];
              return (
                <div
                  key={t}
                  className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-2.5"
                >
                  <div className="text-[11px] font-semibold text-emerald-200">
                    {MEAL_META[t].label}
                  </div>
                  <div className="mt-0.5 text-lg font-extrabold font-mono text-white">
                    ₹{s?.price ?? SAME_DAY_MEAL_PRICES[t]}
                  </div>
                  <div className="text-[10px] text-emerald-100/80">
                    {s?.cutoffDisplay || MEAL_META[t].cutoffDisplay}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 2:1 Selection + Sticky Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left: 3 Meal Slot Cards */}
        <div className="xl:col-span-2 space-y-4">
          {openBookableCount > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-soft flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-600">
                {openBookableCount} of 3 meal slots open for same-day booking today
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllOpen}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-brand-900 hover:bg-emerald-100 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Select All Open ({openBookableCount})
                </button>
                {summary.totalMeals > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedMeals({})}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {MEAL_TYPES.map((type) => {
              const slot = slots[type];
              if (!slot) return null;

              const Icon = MEAL_ICONS[type];
              const meta = MEAL_META[type];
              const isSelected = Boolean(selectedMeals[type] && slot.canBook);
              const mealMenu = todayMenu?.meals?.[type];

              return (
                <div
                  key={type}
                  onClick={() => slot.canBook && toggleMeal(type)}
                  role={slot.canBook ? 'button' : undefined}
                  tabIndex={slot.canBook ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (slot.canBook && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      toggleMeal(type);
                    }
                  }}
                  className={`rounded-2xl border-2 p-5 transition-all shadow-soft ${
                    slot.alreadyBooked
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : !slot.isWindowOpen
                        ? 'border-slate-200 bg-slate-50/70 opacity-75 cursor-not-allowed'
                        : isSelected
                          ? 'border-brand-700 bg-emerald-50/70 shadow-card cursor-pointer'
                          : 'border-slate-200/90 bg-white hover:border-brand-400 cursor-pointer'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-brand-900 text-white'
                            : slot.alreadyBooked
                              ? 'bg-emerald-100 text-emerald-800'
                              : !slot.isWindowOpen
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{meta.label}</h3>
                          <CutoffCountdownPill slot={slot} onExpire={onRefresh} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Serving: {slot.servingTiming}</span>
                          <span>·</span>
                          <span className="font-semibold text-slate-700">
                            Cutoff: {slot.cutoffDisplay}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-extrabold font-mono text-slate-900">
                          ₹{slot.price}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">
                          Same-day rate
                        </div>
                      </div>

                      {slot.alreadyBooked ? (
                        <Link
                          to="/student/coupons"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 px-3 py-1.5 text-xs font-bold text-brand-900 hover:bg-emerald-50"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          {slot.existingCouponCode ? 'View QR Pass' : 'My Coupons'}
                        </Link>
                      ) : slot.canBook ? (
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-brand-900 border-brand-900 text-white'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                          {isSelected ? 'Selected' : 'Select Meal'}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          <Lock className="h-3.5 w-3.5" />
                          Cutoff Passed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Today's Menu Preview inside Card */}
                  <div className="mt-4 pt-3.5 border-t border-slate-200/70">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Today&apos;s Published Menu
                    </div>
                    {mealMenu && mealMenu.items?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {mealMenu.items.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {item.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-400">Menu not published yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sticky Same-Day Checkout Summary */}
        <div className="xl:sticky xl:top-24 bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Same-Day Summary</h3>
              <p className="text-xs text-slate-500 mt-0.5">{formatDisplayDate(todayStr)}</p>
            </div>
            <StatusBadge status="SAME_DAY" />
          </div>

          {summary.totalMeals === 0 ? (
            <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              {openBookableCount > 0
                ? 'Select any open meal card on the left to book for today.'
                : 'No further same-day meal slots are bookable for today.'}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {summary.mealTypes.map((type) => (
                <div key={type} className="flex items-center justify-between text-slate-700">
                  <span>{MEAL_META[type].label} (Today)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(slots[type]?.price ?? SAME_DAY_MEAL_PRICES[type])}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Meals Selected</span>
              <span className="font-mono text-slate-900">{summary.totalMeals} / 3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">Payable Total</span>
              <span className="text-2xl font-extrabold font-mono text-brand-900">
                {formatINR(summary.grandTotal)}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3 text-[11px] font-medium text-emerald-900">
            No minimum purchase amount applies to same-day bookings. Digital QR coupons become active immediately for today.
          </div>

          <button
            type="button"
            disabled={summary.totalMeals === 0 || submitting}
            onClick={handleProceedSameDay}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-900 px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-brand-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CreditCard className="h-4 w-4" />
            {submitting
              ? 'Preparing Order…'
              : summary.totalMeals === 0
                ? 'Select a Meal to Proceed'
                : `Pay ${formatINR(summary.grandTotal)} & Book Now`}
          </button>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-brand-800 shrink-0 mt-0.5" />
            <span>
              {paymentGatewayMode === 'RAZORPAY'
                ? isRazorpayTestMode
                  ? 'Razorpay Test Mode active — No real money is moved. Same-day prices and cutoffs are verified server-side.'
                  : 'Razorpay Checkout active. Same-day prices and cutoffs are verified server-side.'
                : 'Development Payment Simulator active (Razorpay Test keys unset).'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
