import { useEffect, useState, useCallback } from 'react';
import { ReceiptIndianRupee, FileText } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReceiptModal } from '../../components/student/ReceiptModal';
import { formatISTDateTime } from '../../utils/dateIst';
import { extractApiError, formatINR } from '../../utils/formatters';

export function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await studentService.getPayments();
      setPayments(list);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load payment records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadPayments} />;

  return (
    <div className="space-y-6">
      {payments.length === 0 ? (
        <EmptyState
          icon={ReceiptIndianRupee}
          title="No payment transactions yet"
          description="All your weekly meal booking transactions and downloadable receipts will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Payment Transactions</h2>
            <p className="text-xs text-slate-500">
              Verified Razorpay &amp; test-mode payment receipts
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Transaction ID</th>
                  <th className="px-6 py-3.5 font-semibold">Booking ID</th>
                  <th className="px-6 py-3.5 font-semibold">Payment Amount</th>
                  <th className="px-6 py-3.5 font-semibold">Payment Date</th>
                  <th className="px-6 py-3.5 font-semibold">Payment Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                      {p.transactionId}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>{p.bookingCode}</span>
                        {p.bookingType === 'SAME_DAY' ? <StatusBadge status="SAME_DAY" /> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatISTDateTime(p.paidAt || p.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(p)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-emerald-50 transition"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ReceiptModal
        open={Boolean(selectedPayment)}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </div>
  );
}
