import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Coffee,
  Utensils,
  Moon,
  CalendarRange,
  IndianRupee,
  ScanQrCode,
  CalendarPlus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { messService } from '../../services/messService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { formatWeekRange } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

const PIE_COLORS = ['#f59e0b', '#059669', '#4f46e5'];

export function MessDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await messService.getDashboard();
      setData(res);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load mess dashboard.'));
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

  const { summary, bookingWindow, charts } = data;

  const kpiCards = [
    {
      label: 'Total Registered Students',
      value: summary.totalRegisteredStudents,
      sub: 'Verified IIIT Bhubaneswar accounts',
      icon: Users,
      accent: 'bg-slate-100 text-slate-700',
    },
    {
      label: "Today's Breakfast Bookings",
      value: summary.todayBreakfastBookings,
      sub: `${summary.todayBreakfastRedeemed} redeemed today`,
      icon: Coffee,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: "Today's Lunch Bookings",
      value: summary.todayLunchBookings,
      sub: `${summary.todayLunchRedeemed} redeemed today`,
      icon: Utensils,
      accent: 'bg-emerald-50 text-brand-800',
    },
    {
      label: "Today's Dinner Bookings",
      value: summary.todayDinnerBookings,
      sub: `${summary.todayDinnerRedeemed} redeemed today`,
      icon: Moon,
      accent: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Upcoming Weekly Bookings',
      value: summary.upcomingWeeklyBookings,
      sub: formatWeekRange(bookingWindow.targetWeekStartStr, bookingWindow.targetWeekEndStr),
      icon: CalendarRange,
      accent: 'bg-teal-50 text-teal-700',
    },
    {
      label: 'Total Revenue',
      value: formatINR(summary.totalRevenue),
      sub: `${summary.totalPaidTransactions} paid transaction(s)`,
      icon: IndianRupee,
      accent: 'bg-emerald-100 text-brand-900',
    },
  ];

  const hasPieData = charts.mealTypeDistribution.some((m) => m.count > 0);

  return (
    <div className="space-y-6">
      {/* Operations Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-950 via-brand-900 to-emerald-800 p-6 sm:p-7 text-white shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-emerald-200">
            IIIT Bhubaneswar Mess Operations
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
            Mess Control &amp; Demand Overview
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
            Only confirmed &amp; paid student bookings are counted in meal preparation figures.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            to="/mess/verify-coupons"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-950 shadow-sm hover:bg-emerald-50 transition"
          >
            <ScanQrCode className="h-4 w-4" />
            Verify Coupons
          </Link>
          <Link
            to="/mess/manage-menu"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition"
          >
            <CalendarPlus className="h-4 w-4" />
            Manage Menu
          </Link>
        </div>
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
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
              <div className="mt-3 text-2xl font-extrabold font-mono text-slate-900">
                {card.value}
              </div>
              <div className="mt-1 text-xs text-slate-400">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Recharts Visualizations Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Meal Booking Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Daily Meal Booking Distribution</h3>
            <p className="text-xs text-slate-500">
              Confirmed meals across current and upcoming week
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.dailyMealDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="BREAKFAST" name="Breakfast" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="LUNCH" name="Lunch" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="DINNER" name="Dinner" stackId="a" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Meal Demand (Upcoming Mon-Sun) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Upcoming Weekly Meal Demand</h3>
            <p className="text-xs text-slate-500">
              {formatWeekRange(bookingWindow.targetWeekStartStr, bookingWindow.targetWeekEndStr)}
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.weeklyMealDemand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="BREAKFAST" name="Breakfast" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="LUNCH" name="Lunch" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DINNER" name="Dinner" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recharts Visualizations Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakfast vs Lunch vs Dinner Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Breakfast vs Lunch vs Dinner Split
            </h3>
            <p className="text-xs text-slate-500">Share of all confirmed student meal bookings</p>
          </div>
          {!hasPieData ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              No confirmed meal bookings recorded yet.
            </div>
          ) : (
            <div className="h-72 flex flex-col sm:flex-row items-center">
              <div className="w-full sm:w-2/3 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.mealTypeDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {charts.mealTypeDistribution.map((entry, idx) => (
                        <Cell key={entry.mealType} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/3 space-y-2.5 text-xs">
                {charts.mealTypeDistribution.map((item, idx) => (
                  <div
                    key={item.mealType}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx] }}
                      />
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Weekly Revenue Trend</h3>
            <p className="text-xs text-slate-500">Total verified revenue (INR) per mess week</p>
          </div>
          {charts.weeklyRevenue.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              Revenue chart will populate once weekly bookings are paid.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.weeklyRevenue}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [formatINR(val), 'Revenue']}
                    contentStyle={{
                      borderRadius: '12px',
                      borderColor: '#e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#065f46"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
