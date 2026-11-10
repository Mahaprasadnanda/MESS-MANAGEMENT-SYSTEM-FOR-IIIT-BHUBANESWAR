export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F9F8] gap-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
        <div className="absolute inset-0 rounded-full border-4 border-brand-800 border-t-transparent animate-spin" />
      </div>
      <div className="text-sm font-medium text-slate-600">Loading IIIT Bhubaneswar Mess Portal…</div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-9 w-9 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-7 w-20 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-36 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-6 py-4 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-slate-100 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
      <CardSkeleton count={4} />
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
