const STATUS_STYLES = {
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REDEEMED: 'bg-sky-50 text-sky-800 border-sky-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  REFUNDED: 'bg-purple-50 text-purple-800 border-purple-200',
  BREAKFAST: 'bg-amber-50 text-amber-800 border-amber-200',
  LUNCH: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  DINNER: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  SAME_DAY: 'bg-orange-50 text-orange-800 border-orange-200',
  WEEKLY: 'bg-teal-50 text-teal-800 border-teal-200',
};

const DISPLAY_LABELS = {
  SAME_DAY: 'SAME DAY',
};

export function StatusBadge({ status, className = '' }) {
  const key = String(status || '').toUpperCase();
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = DISPLAY_LABELS[key] || key;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${style} ${className}`}
    >
      {label}
    </span>
  );
}
