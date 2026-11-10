import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  subtitle = null,
  maxWidth = 'max-w-lg',
  children,
  footer = null,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fadeIn">
      <div
        className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer ? (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
