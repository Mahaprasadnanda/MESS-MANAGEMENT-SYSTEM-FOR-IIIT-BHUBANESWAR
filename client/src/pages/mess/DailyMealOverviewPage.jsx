import { useEffect, useState, useCallback } from 'react';
import { Coffee, Utensils, Moon, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { messService } from '../../services/messService';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDisplayDate, getTodayDateStrIST, addDaysToDateStr } from '../../utils/dateIst';
import { extractApiError } from '../../utils/formatters';

export function DailyMealOverviewPage() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateStrIST());
  const [mealType, setMealType] = useState('ALL');
  const [redemptionStatus, setRedemptionStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await messService.getDailyMealOverview({
        date: selectedDate,
        mealType,
        redemptionStatus,
        search: debouncedSearch,
        page,
        limit: 15,
      });
      setData(res);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load daily meal overview.'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, mealType, redemptionStatus, debouncedSearch, page]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const counts = data?.counts || { BREAKFAST: 0, LUNCH: 0, DINNER: 0, total: 0 };

  const mealCards = [
    {
      key: 'BREAKFAST',
      label: 'Breakfast Bookings',
      count: counts.BREAKFAST,
      icon: Coffee,
      ring: 'ring-amber-400 border-amber-300 bg-amber-50/40',
      iconBg: 'bg-amber-50 text-amber-700',
    },
    {
      key: 'LUNCH',
      label: 'Lunch Bookings',
      count: counts.LUNCH,
      icon: Utensils,
      ring: 'ring-emerald-500 border-emerald-400 bg-emerald-50/40',
      iconBg: 'bg-emerald-50 text-brand-800',
    },
    {
      key: 'DINNER',
      label: 'Dinner Bookings',
      count: counts.DINNER,
      icon: Moon,
      ring: 'ring-indigo-400 border-indigo-300 bg-indigo-50/40',
      iconBg: 'bg-indigo-50 text-indigo-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Selector Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-brand-800 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Preparation Counts · {formatDisplayDate(selectedDate)}
            </h2>
            <p className="text-xs text-slate-500">
              Click any meal card below to filter the student preparation list
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(getTodayDateStrIST());
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(addDaysToDateStr(getTodayDateStrIST(), 1));
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tomorrow
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
                setPage(1);
              }
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
          />
        </div>
      </div>

      {/* 3 Clickable Meal Count Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mealCards.map((card) => {
          const Icon = card.icon;
          const isActive = mealType === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setMealType((prev) => (prev === card.key ? 'ALL' : card.key));
                setPage(1);
              }}
              className={`text-left rounded-2xl border p-5 shadow-soft transition-all ${
                isActive
                  ? `ring-2 ${card.ring}`
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">{card.label}</span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono text-slate-900">
                  {card.count}
                </span>
                <span className="text-[11px] font-semibold text-brand-800">
                  {isActive ? 'Showing only this meal ×' : 'Click to inspect →'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMealType(m);
                setPage(1);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                mealType === m
                  ? 'bg-brand-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {m === 'ALL' ? `All (${counts.total})` : m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={redemptionStatus}
            onChange={(e) => {
              setRedemptionStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-700 focus:outline-none"
          >
            <option value="ALL">All Redemption States</option>
            <option value="ACTIVE">Active (Unredeemed)</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, ID, coupon…"
              className="rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none w-56"
            />
          </div>
        </div>
      </div>

      {/* Student List Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOverview} />
      ) : data?.students?.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No confirmed student bookings for this selection"
          description="Only students with confirmed & paid bookings appear in the preparation list."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Student Name</th>
                  <th className="px-5 py-3.5 font-semibold">Student ID</th>
                  <th className="px-5 py-3.5 font-semibold">Institutional Email</th>
                  <th className="px-5 py-3.5 font-semibold">Meal Date</th>
                  <th className="px-5 py-3.5 font-semibold">Meal Type</th>
                  <th className="px-5 py-3.5 font-semibold">Coupon ID</th>
                  <th className="px-5 py-3.5 font-semibold">Payment</th>
                  <th className="px-5 py-3.5 font-semibold">Redemption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{row.studentName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-900">
                      {row.studentId}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{row.institutionalEmail}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(row.mealDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={row.mealType} />
                        {row.bookingType === 'SAME_DAY' ? <StatusBadge status="SAME_DAY" /> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{row.couponId}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.paymentStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.redemptionStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 ? (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total}{' '}
                records)
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
    </div>
  );
}
