import { AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) {
  const btnClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-brand-900 hover:bg-brand-800 text-white';

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            variant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-brand-800'
          }`}
        >
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed pt-1">{description}</p>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${btnClass}`}
        >
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
