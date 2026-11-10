import { useEffect, useState, useCallback } from 'react';
import { Download, FileSpreadsheet, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { messService } from '../../services/messService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { addDaysToDateStr, formatDisplayDate, formatISTDateTime, getTodayDateStrIST } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

export function PaymentReportsPage() {
  const today = getTodayDateStrIST();
  const [startDate, setStartDate] = useState(() => addDaysToDateStr(today, -6));
  const [endDate, setEndDate] = useState(() => addDaysToDateStr(today, 14));
  const [activeTab, setActiveTab] = useState('students'); // students | meals | payments

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  const loadReports = useCallback(async () => {
    if (startDate > endDate) {
      toast.error('Start date cannot be after end date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await messService.getReports({ startDate, endDate });
      setReport(data);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load reports.'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      await messService.downloadReportCsv({ startDate, endDate, type });
      toast.success('CSV report downloaded!');
    } catch (err) {
      toast.error(extractApiError(err, 'Failed to export CSV report.'));
    } finally {
      setExporting('');
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadReports} />;
  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Range & CSV Export Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="h-4 w-4 text-brand-800" />
            Date Range:
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => e.target.value && setEndDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => handleExport('meals')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting === 'meals' ? 'Exporting…' : 'Export Meal Bookings CSV'}
          </button>
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => handleExport('payments')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-brand-800" />
            {exporting === 'payments' ? 'Exporting…' : 'Export Payments CSV'}
          </button>
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => handleExport('students')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-brand-800" />
            {exporting === 'students' ? 'Exporting…' : 'Export Student Summary CSV'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">Total Confirmed Meals</div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
            {report.mealCounts.total}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {report.mealCounts.BREAKFAST}B · {report.mealCounts.LUNCH}L ·{' '}
            {report.mealCounts.DINNER}D
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">Meal Value in Range</div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-brand-900">
            {formatINR(report.mealCounts.mealRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Across selected meal dates</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">Payments Collected</div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-700">
            {formatINR(report.paymentSummary.paidRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {report.paymentSummary.paidCount} paid transaction(s)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">Payment Attempt Health</div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
            {report.paymentSummary.totalTransactions}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {report.paymentSummary.failedCount} failed · {report.paymentSummary.pendingCount} pending
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          {[
            { key: 'students', label: `Student Summary (${report.studentSummaries.length})` },
            { key: 'meals', label: `Meal Booking List (${report.mealDetails.length})` },
            { key: 'payments', label: `Payment Transactions (${report.paymentRecords.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-brand-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'students' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Student ID</th>
                  <th className="px-5 py-3 font-semibold">Student Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Breakfast</th>
                  <th className="px-5 py-3 font-semibold">Lunch</th>
                  <th className="px-5 py-3 font-semibold">Dinner</th>
                  <th className="px-5 py-3 font-semibold">Total Meals</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.studentSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-xs text-slate-400">
                      No student meal bookings in this date range.
                    </td>
                  </tr>
                ) : (
                  report.studentSummaries.map((s) => (
                    <tr key={s.email} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-brand-900">
                        {s.studentId}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{s.studentName}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">{s.email}</td>
                      <td className="px-5 py-3 font-mono">{s.breakfastCount}</td>
                      <td className="px-5 py-3 font-mono">{s.lunchCount}</td>
                      <td className="px-5 py-3 font-mono">{s.dinnerCount}</td>
                      <td className="px-5 py-3 font-mono font-bold">{s.totalMeals}</td>
                      <td className="px-5 py-3 font-mono font-bold text-right">
                        {formatINR(s.totalSpent)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'meals' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Meal Date</th>
                  <th className="px-5 py-3 font-semibold">Meal</th>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Coupon Code</th>
                  <th className="px-5 py-3 font-semibold">Redemption</th>
                  <th className="px-5 py-3 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.mealDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                      No confirmed meal entries in this date range.
                    </td>
                  </tr>
                ) : (
                  report.mealDetails.map((m, idx) => (
                    <tr key={`${m.couponCode}-${idx}`} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">
                        {formatDisplayDate(m.mealDate)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={m.mealType} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{m.studentName}</div>
                        <div className="text-xs font-mono text-slate-500">{m.studentId}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{m.couponCode}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={m.redemptionStatus} />
                      </td>
                      <td className="px-5 py-3 font-mono font-semibold text-right">
                        {formatINR(m.price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Transaction ID</th>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Booking ID</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.paymentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                      No payment records in this date range.
                    </td>
                  </tr>
                ) : (
                  report.paymentRecords.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800">
                        {p.transactionId}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{p.studentName}</div>
                        <div className="text-xs font-mono text-slate-500">{p.studentId}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">
                        {p.bookingCode}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {formatINR(p.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatISTDateTime(p.paidAt || p.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
