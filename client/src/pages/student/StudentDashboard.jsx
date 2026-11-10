import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Utensils,
  QrCode,
  IndianRupee,
  CalendarCheck2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Eye,
  Zap,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CountdownTimer } from '../../components/student/CountdownTimer';
import { CouponModal } from '../../components/student/CouponModal';
import { BookingDetailsModal } from '../../components/student/BookingDetailsModal';
import { MEAL_META, MEAL_TYPES } from '../../utils/constants';
import { formatDisplayDate, formatWeekRange } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

export function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentService.getDashboard();
      setData(res);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load student dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;
  if (!data) return null;

  const {
    student,
    bookingWindow,
    sameDayWindow,
    nextWeekBookingStatus,
    summary,
    upcomingMeals,
    todayMenu,
    recentBookings,
  } = data;

  const isNextWeekConfirmed =
    nextWeekBookingStatus?.bookingStatus === 'CONFIRMED' &&
    nextWeekBookingStatus?.paymentStatus === 'PAID';

  const kpis = [
    {
      label: 'Upcoming Booked Meals',
      value: summary.upcomingBookedMealsCount,
      sub: 'Confirmed meals from today',
      icon: Utensils,
      accent: 'bg-emerald-50 text-brand-800',
    },
    {
      label: 'Total Meals Booked',
      value: summary.totalMealsBooked,
      sub: `${summary.totalConfirmedWeeks} confirmed week(s)`,
      icon: CalendarCheck2,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Total Amount Paid',
      value: formatINR(summary.totalAmountPaid),
      sub: 'Verified online payments',
      icon: IndianRupee,
      accent: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Active Coupons Ready',
      value: summary.activeCouponsCount,
      sub: 'Redeemable at mess counter',
      icon: QrCode,
      accent: 'bg-indigo-50 text-indigo-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Deadline Countdown Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-emerald-800 p-6 sm:p-8 text-white shadow-card">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <span>Student ID: {student.studentId}</span>
              <span>·</span>
              <span>Current Week: {formatWeekRange(bookingWindow.currentWeekStartStr, bookingWindow.currentWeekEndStr)}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {student.fullName}
            </h2>
            <p className="text-sm text-emerald-100/85">
              Next bookable mess week:{' '}
              <span className="font-semibold text-white">
                {formatWeekRange(bookingWindow.targetWeekStartStr, bookingWindow.targetWeekEndStr)}
              </span>{' '}
              (closes {bookingWindow.deadlineDisplay}).
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isNextWeekConfirmed ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Next week booked ({nextWeekBookingStatus.totalMeals} meals)
                </div>
              ) : (
                <Link
                  to="/student/book-meals"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-950 shadow-sm hover:bg-emerald-50 transition"
                >
                  Book Next Week&apos;s Meals
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/student/book-meals?mode=same-day"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400/20 border border-amber-300/40 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-amber-400/30 transition"
              >
                <Zap className="h-4 w-4 text-amber-300" />
                Same-Day Booking ({sameDayWindow?.availableCount ?? 0} open today)
              </Link>
              <Link
                to="/student/coupons"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition"
              >
                <QrCode className="h-4 w-4" />
                My Meal Coupons
              </Link>
            </div>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 mb-2.5">
              <Clock className="h-3.5 w-3.5" />
              Booking Closes (Monday 12:00 AM IST)
            </div>
            <CountdownTimer closesAtISO={bookingWindow.closesAtISO} onExpire={loadDashboard} />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft hover:shadow-card transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
                {card.value}
              </div>
              <div className="mt-1 text-xs text-slate-400">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Same-Day Meal Booking Strip */}
      {sameDayWindow ? (
        <div className="bg-white rounded-2xl border border-amber-200/90 shadow-soft p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Same-Day Booking Open for Today ({formatDisplayDate(sameDayWindow.todayStr, false)})
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                {MEAL_TYPES.map((t) => {
                  const slot = sameDayWindow.slots?.[t];
                  if (!slot) return null;
                  return (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${
                        slot.alreadyBooked
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : slot.isWindowOpen
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="font-bold">{slot.label} ₹{slot.price}</span>
                      <span>·</span>
                      <span>
                        {slot.alreadyBooked
                          ? 'Booked'
                          : slot.isWindowOpen
                            ? slot.cutoffDisplay
                            : 'Closed'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <Link
            to="/student/book-meals?mode=same-day"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-800 transition shrink-0"
          >
            Book Today&apos;s Meals
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {/* Two-column section: Upcoming Meals & Today's Menu Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Booked Meals */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Booked Meals</h3>
              <p className="text-xs text-slate-500">Tap any meal to open its QR coupon</p>
            </div>
            <Link
              to="/student/coupons"
              className="text-xs font-semibold text-brand-800 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>

          {upcomingMeals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <EmptyState
                icon={Utensils}
                title="No upcoming meals booked"
                description="Book your meals for next Monday–Sunday before Sunday midnight IST."
                action={
                  <Link
                    to="/student/book-meals"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    Book Meals Now
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingMeals.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {m.dayName.slice(0, 3)}, {formatDisplayDate(m.mealDate, false)}
                      </span>
                      <StatusBadge status={m.mealType} />
                    </div>
                    <div className="mt-0.5 text-xs font-mono text-slate-500 truncate">
                      {m.coupon?.couponCode || 'Pending'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.coupon ? <StatusBadge status={m.coupon.status} /> : null}
                    {m.coupon ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCoupon({
                            ...m.coupon,
                            mealDate: m.mealDate,
                            dayName: m.dayName,
                            mealType: m.mealType,
                            studentName: student.fullName,
                            studentRollId: student.studentId,
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-800 hover:bg-emerald-50 transition"
                      >
                        QR Pass
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Menu Preview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Today&apos;s Menu ({todayMenu.dayName})
              </h3>
              <p className="text-xs text-slate-500">{formatDisplayDate(todayMenu.date)}</p>
            </div>
            <Link
              to="/student/menu"
              className="text-xs font-semibold text-brand-800 hover:text-brand-700"
            >
              Weekly Menu →
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {MEAL_TYPES.map((type) => {
              const mealMenu = todayMenu.meals[type];
              const meta = MEAL_META[type];
              return (
                <div
                  key={type}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-slate-400">{meta.timing}</span>
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Booking History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Booking History</h3>
            <p className="text-xs text-slate-500">Your latest weekly meal bookings</p>
          </div>
          <Link
            to="/student/bookings"
            className="text-xs font-semibold text-brand-800 hover:text-brand-700"
          >
            All bookings →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No weekly bookings yet. Book your first upcoming week to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Booking ID</th>
                  <th className="px-6 py-3 font-semibold">Week</th>
                  <th className="px-6 py-3 font-semibold">Meals</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Payment</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{b.bookingCode}</span>
                        {b.bookingType === 'SAME_DAY' ? <StatusBadge status="SAME_DAY" /> : null}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {b.bookingType === 'SAME_DAY' && b.sameDayDate
                        ? `Same-Day · ${formatDisplayDate(b.sameDayDate, false)}`
                        : formatWeekRange(b.weekStartDate, b.weekEndDate)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      {b.totalMeals} meals
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">
                      {formatINR(b.totalAmount)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(b)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CouponModal
        open={Boolean(selectedCoupon)}
        coupon={selectedCoupon}
        onClose={() => setSelectedCoupon(null)}
      />
      <BookingDetailsModal
        open={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
