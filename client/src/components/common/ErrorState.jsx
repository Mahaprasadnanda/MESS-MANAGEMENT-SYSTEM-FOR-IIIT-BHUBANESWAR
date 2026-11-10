import { AlertTriangle, RotateCcw } from 'lucide-react';

export function ErrorState({
  title = 'Unable to load data',
  message = 'Something went wrong while communicating with the server.',
  onRetry = null,
}) {
  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center flex flex-col items-center justify-center shadow-soft">
      <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 max-w-md">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 transition"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      ) : null}
    </div>
  );
}
