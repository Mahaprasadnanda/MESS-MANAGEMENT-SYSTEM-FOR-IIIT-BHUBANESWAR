import { Timer } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';

export function CountdownTimer({ closesAtISO, onExpire, compact = false }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(closesAtISO, onExpire);

  const pad = (n) => String(n).padStart(2, '0');

  if (expired) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800">
        <Timer className="h-4 w-4" />
        <span>Booking window transitioning — refreshing…</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 font-mono text-sm font-bold text-brand-900 tabular-nums">
        <Timer className="h-4 w-4 text-emerald-600" />
        <span>
          {days}d : {pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s
        </span>
      </div>
    );
  }

  const cells = [
    { label: 'Days', value: pad(days) },
    { label: 'Hours', value: pad(hours) },
    { label: 'Mins', value: pad(minutes) },
    { label: 'Secs', value: pad(seconds) },
  ];

  return (
    <div className="flex items-center gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex flex-col items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-2.5 py-1.5 min-w-[50px]"
        >
          <span className="text-lg font-bold font-mono tabular-nums leading-none text-white">
            {c.value}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-200 mt-1">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
