import { Printer, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { MEAL_PRICES, SAME_DAY_MEAL_PRICES } from '../../utils/constants';
import { formatINR } from '../../utils/formatters';
import { formatDisplayDate, formatISTDateTime, formatWeekRange } from '../../utils/dateIst';

export function ReceiptModal({ payment, open, onClose }) {
  if (!payment) return null;

  const isSameDay = payment.bookingType === 'SAME_DAY';
  const prices = payment.mealPrices || (isSameDay ? SAME_DAY_MEAL_PRICES : MEAL_PRICES);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment Receipt"
      subtitle="Official IIIT Bhubaneswar Mess Payment Record"
      maxWidth="max-w-lg"
    >
      <div className="printable-area rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-brand-950 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
              IIIT Bhubaneswar
            </div>
            <div className="text-lg font-bold">Central Mess Payment Receipt</div>
          </div>
          {payment.status === 'PAID' ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              PAID
            </div>
          ) : (
            <StatusBadge status={payment.status} />
          )}
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-400">Student Name</div>
              <div className="font-semibold text-slate-900">{payment.student?.fullName}</div>
              <div className="text-xs text-slate-500 font-mono">{payment.student?.studentId}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Payment Date</div>
              <div className="font-semibold text-slate-900">
                {formatISTDateTime(payment.paidAt || payment.createdAt)}
              </div>
              <div className="text-xs text-slate-500">{payment.student?.email}</div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-mono font-semibold text-slate-900">{payment.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Booking ID</span>
              <span className="font-mono font-semibold text-slate-900">{payment.bookingCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isSameDay ? 'Same-Day Date' : 'Mess Week'}</span>
              <span className="font-semibold text-slate-900">
                {isSameDay && payment.sameDayDate
                  ? `${formatDisplayDate(payment.sameDayDate)} (Same-Day)`
                  : formatWeekRange(payment.weekStartDate, payment.weekEndDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode</span>
              <span className="font-semibold text-slate-700">{payment.provider}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-4 space-y-2 text-xs">
            <div className="font-semibold text-slate-700 mb-1">Itemized Meal Summary</div>
            <div className="flex justify-between text-slate-600">
              <span>
                Breakfast ({payment.breakfastCount} × ₹{prices.BREAKFAST})
              </span>
              <span className="font-mono">
                {formatINR(payment.breakfastCount * prices.BREAKFAST)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                Lunch ({payment.lunchCount} × ₹{prices.LUNCH})
              </span>
              <span className="font-mono">{formatINR(payment.lunchCount * prices.LUNCH)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                Dinner ({payment.dinnerCount} × ₹{prices.DINNER})
              </span>
              <span className="font-mono">{formatINR(payment.dinnerCount * prices.DINNER)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Amount ({payment.totalMeals} meals)</span>
              <span className="font-mono text-brand-900">{formatINR(payment.amount)}</span>
            </div>
          </div>

          {payment.failureReason ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              Note: {payment.failureReason}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3 no-print">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
      </div>
    </Modal>
  );
}
