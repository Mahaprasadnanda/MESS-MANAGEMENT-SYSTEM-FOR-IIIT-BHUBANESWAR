import { QRCodeCanvas } from 'qrcode.react';
import { Calendar, Download, Printer, User, Utensils } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { MEAL_META } from '../../utils/constants';
import { formatDisplayDate, formatISTDateTime } from '../../utils/dateIst';

export function CouponModal({ coupon, open, onClose }) {
  if (!coupon) return null;

  const mealInfo = MEAL_META[coupon.mealType] || {};

  const handleDownloadQR = () => {
    const canvas = document.getElementById('coupon-qr-canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${coupon.couponCode}.png`;
    link.click();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Digital Meal Coupon"
      subtitle="Present this QR pass at the IIIT Bhubaneswar Mess counter"
      maxWidth="max-w-md"
    >
      <div className="printable-area rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-emerald-800 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold">
              IIIT Bhubaneswar Mess
            </div>
            <div className="text-lg font-bold mt-0.5">{mealInfo.label || coupon.mealType} Pass</div>
          </div>
          <StatusBadge status={coupon.status} className="bg-white/95" />
        </div>

        {/* QR Code Area */}
        <div className="p-6 flex flex-col items-center bg-slate-50/70 border-b border-dashed border-slate-300">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <QRCodeCanvas
              id="coupon-qr-canvas"
              value={coupon.qrPayload || coupon.couponCode}
              size={196}
              level="H"
              includeMargin={false}
              fgColor="#022c22"
            />
          </div>
          <div className="mt-4 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Unique Coupon ID
            </div>
            <div className="mt-0.5 text-base font-bold font-mono text-slate-900 select-all">
              {coupon.couponCode}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <User className="h-4 w-4 text-slate-400" />
              Student
            </span>
            <span className="font-semibold text-slate-900 text-right">
              {coupon.studentName} ({coupon.studentRollId})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Calendar className="h-4 w-4 text-slate-400" />
              Meal Date
            </span>
            <span className="font-semibold text-slate-900">
              {coupon.dayName}, {formatDisplayDate(coupon.mealDate)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Utensils className="h-4 w-4 text-slate-400" />
              Meal &amp; Timing
            </span>
            <span className="font-semibold text-slate-900">
              {mealInfo.label} · {mealInfo.timing}
            </span>
          </div>

          {coupon.status === 'REDEEMED' && coupon.redeemedAt ? (
            <div className="mt-2 rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900">
              Redeemed on <span className="font-semibold">{formatISTDateTime(coupon.redeemedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2.5 no-print">
        <button
          type="button"
          onClick={handleDownloadQR}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Download className="h-4 w-4" />
          Download QR
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition"
        >
          <Printer className="h-4 w-4" />
          Print Pass
        </button>
      </div>
    </Modal>
  );
}
