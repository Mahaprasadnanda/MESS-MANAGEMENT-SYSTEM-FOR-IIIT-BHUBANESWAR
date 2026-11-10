import { useState, useEffect } from 'react';

function computeRemaining(targetIso) {
  if (!targetIso) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

export function useCountdown(targetIso, onExpire) {
  const [remaining, setRemaining] = useState(() => computeRemaining(targetIso));

  useEffect(() => {
    setRemaining(computeRemaining(targetIso));
    if (!targetIso) return undefined;

    const timer = setInterval(() => {
      const next = computeRemaining(targetIso);
      setRemaining(next);
      if (next.expired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetIso, onExpire]);

  return remaining;
}
