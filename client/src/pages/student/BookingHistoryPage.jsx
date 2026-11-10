import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History, Eye } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BookingDetailsModal } from '../../components/student/BookingDetailsModal';
import { formatDisplayDate, formatISTDateTime, formatWeekRange } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

export function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await studentService.getBookings();
      setBookings(list);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load booking history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadBookings} />;

  return (
    <div className="space-y-6">
      {bookings.length === 0 ? (
        <EmptyState
          icon={History}
          title="No meal bookings yet"
          description="Your weekly meal bookings (both upcoming and past) will appear here."
          action={
            <Link
              to="/student/book-meals"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Book Next Week&apos;s Meals
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">All Meal Bookings</h2>
            <p className="text-xs text-slate-500">
              Weekly advance bookings &amp; instant same-day meal passes
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Period / Date</th>
                  <th className="px-6 py-3.5 font-semibold">Booking ID</th>
                  <th className="px-6 py-3.5 font-semibold">Total Meals</th>
                  <th className="px-6 py-3.5 font-semibold">Amount</th>
                  <th className="px-6 py-3.5 font-semibold">Payment Status</th>
                  <th className="px-6 py-3.5 font-semibold">Booking Status</th>
                  <th className="px-6 py-3.5 font-semibold">Date Created</th>
                  <th className="px-6 py-3.5 font-semibold text-right">View Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>
                          {b.bookingType === 'SAME_DAY' && b.sameDayDate
                            ? formatDisplayDate(b.sameDayDate)
                            : formatWeekRange(b.weekStartDate, b.weekEndDate)}
                        </span>
                        <StatusBadge status={b.bookingType || 'WEEKLY'} />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{b.bookingCode}</td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-semibold">{b.totalMeals}</span>{' '}
                      <span className="text-xs text-slate-400">
                        ({b.breakfastCount}B · {b.lunchCount}L · {b.dinnerCount}D)
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {formatINR(b.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatISTDateTime(b.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(b)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-emerald-50 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BookingDetailsModal
        open={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
