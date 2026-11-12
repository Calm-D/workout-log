import { useEffect, useState } from 'react';

export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}

export function useElapsed(startedAt?: number): number {
  const now = useNow(Boolean(startedAt), 1000);
  return startedAt ? Math.max(0, now - startedAt) : 0;
}
