import { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatINR } from '../../utils/formatters';

export function DevPaymentSimulatorModal({
  open,
  orderData,
  onSimulateSuccess,
  onSimulateFailure,
  onClose,
}) {
  const [processing, setProcessing] = useState(false);

  if (!orderData) return null;

  const handleSuccess = async () => {
    setProcessing(true);
    try {
      await onSimulateSuccess();
    } finally {
      setProcessing(false);
    }
  };

  const handleFail = async () => {
    setProcessing(true);
    try {
      await onSimulateFailure();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={processing ? undefined : onClose}
      title="Development Payment Simulator"
      subtitle="Development Mode Only — Razorpay test keys are not configured"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong>Development Mode Only:</strong> This simulator lets you test full server-side
            payment verification, atomic coupon creation, and failed-payment handling without live
            Razorpay credentials. It is strictly disabled in production.
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Order ID</span>
            <span className="font-mono text-xs font-semibold text-slate-800">
              {orderData.order.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Booking Reference</span>
            <span className="font-mono text-xs font-semibold text-slate-800">
              {orderData.booking.bookingCode}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Meals Selected</span>
            <span className="font-semibold text-slate-900">
              {orderData.booking.totalMeals} meals
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Payable Amount</span>
            <span className="text-xl font-bold font-mono text-brand-900">
              {formatINR(orderData.order.amountRupees)}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={processing}
            onClick={handleSuccess}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            {processing ? 'Verifying Payment…' : 'Simulate Successful Payment'}
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={handleFail}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Simulate Failed Payment
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <CreditCard className="h-4 w-4" />
            Cancel &amp; Modify Selection
          </button>
        </div>
      </div>
    </Modal>
  );
}
