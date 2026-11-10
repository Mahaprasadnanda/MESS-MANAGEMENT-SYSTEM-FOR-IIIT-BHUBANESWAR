import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, CheckCircle2, Ticket, IndianRupee } from 'lucide-react';
import { messService } from '../../services/messService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { extractApiError, formatINR } from '../../utils/formatters';

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await messService.getDashboard();
      setData(res);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load analytics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadAnalytics} />;
  if (!data) return null;

  const { charts, couponStatusCounts, summary } = data;
  const totalCoupons =
    couponStatusCounts.ACTIVE + couponStatusCounts.REDEEMED + couponStatusCounts.EXPIRED;
  const redemptionRate =
    totalCoupons > 0 ? Math.round((couponStatusCounts.REDEEMED / totalCoupons) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Coupon Redemption Rate</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold font-mono text-slate-900">
            {redemptionRate}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {couponStatusCounts.REDEEMED} redeemed of {totalCoupons} issued
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Coupons</span>
            <Ticket className="h-5 w-5 text-brand-800" />
          </div>
          <div className="mt-3 text-2xl font-extrabold font-mono text-slate-900">
            {couponStatusCounts.ACTIVE}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {couponStatusCounts.EXPIRED} expired unredeemed
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cumulative Revenue</span>
            <IndianRupee className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="mt-3 text-2xl font-extrabold font-mono text-brand-900">
            {formatINR(summary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {summary.totalPaidTransactions} confirmed payment(s)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Top Revenue Meal</span>
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">
            {[...charts.mealTypeDistribution].sort((a, b) => b.revenue - a.revenue)[0]?.name || '—'}
          </div>
          <div className="mt-1 text-xs text-slate-400">Highest grossing meal category</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
          <h3 className="text-base font-bold text-slate-900">Revenue by Meal Category</h3>
          <p className="text-xs text-slate-500 mb-4">
            Total confirmed revenue contribution from Breakfast, Lunch, and Dinner
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.mealTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val, name) => [name === 'revenue' ? formatINR(val) : val, name]}
                  contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="revenue" name="Revenue (INR)" fill="#065f46" radius={[6, 6, 0, 0]} />
                <Bar dataKey="count" name="Meal Count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
          <h3 className="text-base font-bold text-slate-900">Weekly Bookings &amp; Meals Growth</h3>
          <p className="text-xs text-slate-500 mb-4">
            Confirmed weekly student bookings vs total meals booked per week
          </p>
          {charts.weeklyRevenue.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              No weekly bookings recorded yet.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      borderColor: '#e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="totalMeals"
                    name="Total Meals"
                    stroke="#065f46"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bookingsCount"
                    name="Weekly Bookings"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
