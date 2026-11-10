import { UtensilsCrossed } from 'lucide-react';

export function BrandLogo({ dark = false, subtitle = 'IIIT Bhubaneswar' }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${
          dark
            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
            : 'bg-brand-900 text-emerald-300 ring-1 ring-brand-800'
        }`}
      >
        <UtensilsCrossed className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div
          className={`text-sm font-bold tracking-tight ${
            dark ? 'text-white' : 'text-slate-900'
          }`}
        >
          IIIT-BBSR Mess
        </div>
        <div
          className={`text-[11px] font-medium ${
            dark ? 'text-emerald-200/80' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
