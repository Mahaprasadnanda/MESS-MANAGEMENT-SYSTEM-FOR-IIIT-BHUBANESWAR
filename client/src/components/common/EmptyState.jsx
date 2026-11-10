import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'No records match your current view.',
  action = null,
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300/90 p-10 text-center flex flex-col items-center justify-center">
      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-brand-800 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
