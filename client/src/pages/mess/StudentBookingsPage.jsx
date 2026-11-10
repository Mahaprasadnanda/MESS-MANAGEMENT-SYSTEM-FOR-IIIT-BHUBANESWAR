import { useEffect, useState, useCallback } from 'react';
import { Search, Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { messService } from '../../services/messService';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatDisplayDate, formatISTDateTime, formatWeekRange } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

export function StudentBookingsPage() {
  const [weekStartDate, setWeekStartDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectBooking, setInspectBooking] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await messService.getStudentBookings({
        weekStartDate,
        status,
        search: debouncedSearch,
        page,
        limit: 15,
      });
      setData(res);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load student bookings.'));
    } finally {
      setLoading(false);
    }
  }, [weekStartDate, status, debouncedSearch, page]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={weekStartDate}
            onChange={(e) => {
              setWeekStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-700 focus:outline-none"
          >
            <option value="">All Weeks</option>
            {(data?.availableWeeks || []).map((w) => (
              <option key={w.weekStartDate} value={w.weekStartDate}>
                {formatWeekRange(w.weekStartDate, w.weekEndDate)}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-700 focus:outline-none"
          >
            <option value="ALL">All Booking Statuses</option>
            <option value="CONFIRMED">Confirmed Only</option>
            <option value="PENDING">Pending Only</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, ID, booking code…"
            className="rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none w-60"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadBookings} />
      ) : data?.bookings?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No student bookings found"
          description="Weekly bookings submitted by students will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Booking ID</th>
                  <th className="px-5 py-3.5 font-semibold">Student</th>
                  <th className="px-5 py-3.5 font-semibold">Week / Date</th>
                  <th className="px-5 py-3.5 font-semibold">Breakdown</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Payment</th>
                  <th className="px-5 py-3.5 font-semibold">Booking</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{b.bookingCode}</span>
                        {b.bookingType === 'SAME_DAY' ? <StatusBadge status="SAME_DAY" /> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{b.student.fullName}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {b.student.studentId} · {b.student.email}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {b.bookingType === 'SAME_DAY' && b.sameDayDate
                        ? `Same-Day · ${formatDisplayDate(b.sameDayDate, false)}`
                        : formatWeekRange(b.weekStartDate, b.weekEndDate)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="font-bold text-slate-900">{b.totalMeals}</span> meals (
                      {b.breakfastCount}B / {b.lunchCount}L / {b.dinnerCount}D)
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {formatINR(b.totalAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectBooking(b)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-brand-800 hover:bg-emerald-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Meals
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 ? (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total}{' '}
                bookings)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Inspect Student Meals Modal */}
      <Modal
        open={Boolean(inspectBooking)}
        onClose={() => setInspectBooking(null)}
        title={`Booking ${inspectBooking?.bookingCode || ''}`}
        subtitle={
          inspectBooking
            ? `${inspectBooking.student.fullName} (${inspectBooking.student.studentId}) · Created ${formatISTDateTime(inspectBooking.createdAt)}`
            : ''
        }
        maxWidth="max-w-2xl"
      >
        {inspectBooking ? (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Meal</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Coupon Code</th>
                  <th className="px-4 py-3 font-semibold">Coupon Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspectBooking.mealBookings.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {formatDisplayDate(m.mealDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={m.mealType} />
                    </td>
                    <td className="px-4 py-2.5 font-mono">{formatINR(m.price)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">
                      {m.couponCode || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {m.couponStatus ? <StatusBadge status={m.couponStatus} /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
