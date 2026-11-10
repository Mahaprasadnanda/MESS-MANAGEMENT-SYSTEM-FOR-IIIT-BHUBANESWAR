import { useEffect, useState, useCallback } from 'react';
import {
  ScanQrCode,
  CheckCircle2,
  XCircle,
  Search,
  Coffee,
  Utensils,
  Moon,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { messService } from '../../services/messService';
import { QrScannerPanel } from '../../components/mess/QrScannerPanel';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MEAL_META } from '../../utils/constants';
import { formatDisplayDate, formatISTDateTime } from '../../utils/dateIst';
import { extractApiError } from '../../utils/formatters';

export function CouponVerificationPage() {
  const [servingMealType, setServingMealType] = useState('LUNCH');
  const [todayStr, setTodayStr] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { ok: boolean, message: string, coupon?: object }
  const [todayRedemptions, setTodayRedemptions] = useState([]);

  const loadSession = useCallback(async () => {
    try {
      const data = await messService.getVerificationSession();
      setTodayStr(data.todayStr);
      if (data.suggestedMealType) {
        setServingMealType(data.suggestedMealType);
      }
      setTodayRedemptions(data.todayRedemptions || []);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleVerify = useCallback(
    async (couponInput) => {
      if (!String(couponInput || '').trim()) {
        toast.error('Please enter or scan a coupon ID.');
        return;
      }

      setVerifying(true);
      try {
        const res = await messService.verifyCoupon({
          couponInput: String(couponInput).trim(),
          servingMealType,
        });
        setLastResult({
          ok: true,
          message: res.message,
          coupon: res.data.coupon,
        });
        toast.success('Coupon redeemed!');
        setManualInput('');
        // Refresh today's redemptions log
        const session = await messService.getVerificationSession();
        setTodayRedemptions(session.todayRedemptions || []);
      } catch (err) {
        const errMsg = extractApiError(err, 'Coupon verification failed.');
        setLastResult({
          ok: false,
          message: errMsg,
        });
        toast.error(errMsg);
      } finally {
        setVerifying(false);
      }
    },
    [servingMealType]
  );

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleVerify(manualInput);
  };

  const mealOptions = [
    { key: 'BREAKFAST', label: 'Breakfast', icon: Coffee },
    { key: 'LUNCH', label: 'Lunch', icon: Utensils },
    { key: 'DINNER', label: 'Dinner', icon: Moon },
  ];

  return (
    <div className="space-y-6">
      {/* Active Serving Session Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-brand-800 flex items-center justify-center shrink-0">
            <ScanQrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Coupon Verification Desk {todayStr ? `· ${formatDisplayDate(todayStr)}` : ''}
            </h2>
            <p className="text-xs text-slate-500">
              Select the meal session currently being served before scanning or looking up coupons
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mealOptions.map((opt) => {
            const Icon = opt.icon;
            const active = servingMealType === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setServingMealType(opt.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition ${
                  active
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Scanner + Manual Lookup | Verification Outcome */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-5">
          {/* QR Camera / Image Scanner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">QR Code Scanner</h3>
              <p className="text-xs text-slate-500">
                Serving <span className="font-bold text-brand-900">{MEAL_META[servingMealType]?.label}</span>{' '}
                ({MEAL_META[servingMealType]?.timing})
              </p>
            </div>
            <QrScannerPanel onScanSuccess={handleVerify} disabled={verifying} />
          </div>

          {/* Manual Coupon ID Lookup */}
          <form
            onSubmit={handleManualSubmit}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 space-y-3"
          >
            <h3 className="text-base font-bold text-slate-900">Manual Coupon ID Lookup</h3>
            <p className="text-xs text-slate-500">
              Enter a student&apos;s Coupon ID (e.g. IIIT-20261116-L-A1B2C3) to verify and redeem
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter Coupon ID…"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm font-mono uppercase focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || !manualInput.trim()}
                className="rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 transition disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify & Redeem'}
              </button>
            </div>
          </form>
        </div>

        {/* Verification Feedback & Today's Redemptions */}
        <div className="space-y-5">
          {/* Verification Result Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
            <h3 className="text-base font-bold text-slate-900 mb-3">Verification Result</h3>

            {!lastResult ? (
              <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
                <ScanQrCode className="h-9 w-9 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-600">Ready to Verify</div>
                <p className="text-xs text-slate-400 mt-1">
                  Scan a QR pass or submit a coupon ID to view instant verification status.
                </p>
              </div>
            ) : lastResult.ok ? (
              <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-sm font-extrabold text-brand-950 uppercase tracking-wide">
                      Verified &amp; Redeemed
                    </div>
                    <p className="text-xs text-emerald-900 mt-0.5">{lastResult.message}</p>
                  </div>
                </div>

                {lastResult.coupon ? (
                  <div className="rounded-xl bg-white border border-emerald-200 p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Student Name</span>
                      <div className="font-bold text-slate-900">
                        {lastResult.coupon.studentName}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Student ID</span>
                      <div className="font-bold font-mono text-brand-900">
                        {lastResult.coupon.studentRollId}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Coupon ID</span>
                      <div className="font-mono font-semibold text-slate-800">
                        {lastResult.coupon.couponCode}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Redeemed At</span>
                      <div className="font-semibold text-slate-800">
                        {formatISTDateTime(lastResult.coupon.redeemedAt)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 flex items-start gap-3">
                <XCircle className="h-7 w-7 text-rose-600 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold text-rose-900 uppercase tracking-wide">
                    Verification Rejected
                  </div>
                  <p className="text-xs font-medium text-rose-800 mt-1">{lastResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Today's Recent Redemptions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  Today&apos;s Redeemed Coupons ({todayRedemptions.length})
                </h3>
              </div>
            </div>

            {todayRedemptions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No coupons have been redeemed today yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {todayRedemptions.map((c) => (
                  <div
                    key={c.id}
                    className="px-6 py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {c.studentName}{' '}
                        <span className="font-mono text-brand-800">({c.studentRollId})</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">{c.couponCode}</div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <StatusBadge status={c.mealType} />
                      <div className="text-[10px] text-slate-400">
                        {formatISTDateTime(c.redeemedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
