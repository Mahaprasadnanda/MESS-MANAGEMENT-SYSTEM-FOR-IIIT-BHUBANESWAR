import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { MEAL_PRICES, SAME_DAY_MEAL_PRICES } from '../../utils/constants';
import { formatDisplayDate, formatWeekRange, formatISTDateTime } from '../../utils/dateIst';
import { formatINR } from '../../utils/formatters';

export function BookingDetailsModal({ booking, open, onClose }) {
  if (!booking) return null;

  const isSameDay = booking.bookingType === 'SAME_DAY';
  const prices = booking.mealPrices || (isSameDay ? SAME_DAY_MEAL_PRICES : MEAL_PRICES);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Booking ${booking.bookingCode}`}
      subtitle={
        isSameDay && booking.sameDayDate
          ? `Same-Day Pass: ${formatDisplayDate(booking.sameDayDate)}`
          : `Week: ${formatWeekRange(booking.weekStartDate, booking.weekEndDate)}`
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Top Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Booking Status</div>
            <div className="mt-1">
              <StatusBadge status={booking.bookingStatus} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Payment Status</div>
            <div className="mt-1">
              <StatusBadge status={booking.paymentStatus} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Total Meals</div>
            <div className="mt-1 text-base font-bold font-mono text-slate-900">
              {booking.totalMeals}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3">
            <div className="text-[11px] font-medium text-brand-800">Amount Paid</div>
            <div className="mt-1 text-base font-bold font-mono text-brand-900">
              {formatINR(booking.totalAmount)}
            </div>
          </div>
        </div>

        {/* Breakdown Pills */}
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          <StatusBadge status={isSameDay ? 'SAME_DAY' : 'WEEKLY'} />
          <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800">
            Breakfast: {booking.breakfastCount} × ₹{prices.BREAKFAST}
          </span>
          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-emerald-800">
            Lunch: {booking.lunchCount} × ₹{prices.LUNCH}
          </span>
          <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-indigo-800">
            Dinner: {booking.dinnerCount} × ₹{prices.DINNER}
          </span>
          <span className="ml-auto text-slate-400 self-center">
            Created {formatISTDateTime(booking.createdAt)}
          </span>
        </div>

        {/* Individual Meals Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Meal</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Coupon ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(booking.mealBookings || []).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {m.dayName?.slice(0, 3)}, {formatDisplayDate(m.mealDate, false)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={m.mealType} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{formatINR(m.price)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                    {m.coupon ? m.coupon.couponCode : 'Not generated'}
                  </td>
                  <td className="px-4 py-2.5">
                    {m.coupon ? (
                      <StatusBadge status={m.coupon.status} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
