import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Search, Calendar, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { studentService } from '../../services/studentService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CouponModal } from '../../components/student/CouponModal';
import { MEAL_META } from '../../utils/constants';
import { formatDisplayDate } from '../../utils/dateIst';
import { extractApiError } from '../../utils/formatters';

export function MyCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mealFilter, setMealFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await studentService.getCoupons();
      setCoupons(list);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load meal coupons.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (mealFilter !== 'ALL' && c.mealType !== mealFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          c.couponCode.toLowerCase().includes(q) ||
          c.mealDate.includes(q) ||
          c.dayName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [coupons, statusFilter, mealFilter, search]);

  const counts = useMemo(() => {
    return coupons.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      { ACTIVE: 0, REDEEMED: 0, EXPIRED: 0 }
    );
  }, [coupons]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadCoupons} />;

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'ALL', label: `All (${coupons.length})` },
              { key: 'ACTIVE', label: `Active (${counts.ACTIVE})` },
              { key: 'REDEEMED', label: `Redeemed (${counts.REDEEMED})` },
              { key: 'EXPIRED', label: `Expired (${counts.EXPIRED})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  statusFilter === tab.key
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={mealFilter}
              onChange={(e) => setMealFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-700 focus:outline-none"
            >
              <option value="ALL">All Meals</option>
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search coupon ID or date…"
                className="rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none w-52"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Grid */}
      {filteredCoupons.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title={coupons.length === 0 ? 'No digital meal coupons yet' : 'No matching coupons'}
          description={
            coupons.length === 0
              ? 'Once you book and pay for your weekly meals, an individual QR coupon is generated for each meal.'
              : 'Try adjusting your status or meal filters.'
          }
          action={
            coupons.length === 0 ? (
              <Link
                to="/student/book-meals"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
              >
                Book Upcoming Meals
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const meta = MEAL_META[coupon.mealType] || {};
            return (
              <div
                key={coupon.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card transition overflow-hidden flex flex-col"
              >
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={coupon.mealType} />
                    {coupon.bookingType === 'SAME_DAY' ? <StatusBadge status="SAME_DAY" /> : null}
                  </div>
                  <StatusBadge status={coupon.status} />
                </div>

                <div className="p-5 flex items-center gap-4 flex-1">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                    <QRCodeSVG
                      value={coupon.qrPayload || coupon.couponCode}
                      size={76}
                      level="M"
                      fgColor="#022c22"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <Calendar className="h-3.5 w-3.5 text-brand-800 shrink-0" />
                      <span>
                        {coupon.dayName.slice(0, 3)}, {formatDisplayDate(coupon.mealDate)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{meta.timing}</div>
                    <div className="pt-1 font-mono text-xs font-semibold text-slate-700 truncate">
                      {coupon.couponCode}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    {coupon.studentRollId} · {coupon.studentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCoupon(coupon)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View QR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CouponModal
        open={Boolean(selectedCoupon)}
        coupon={selectedCoupon}
        onClose={() => setSelectedCoupon(null)}
      />
    </div>
  );
}
