import { useState, useCallback, useRef, useEffect } from 'react';

interface QueueState {
  isQueued: boolean;
  cooldownMs: number;
  cooldownRemaining: number;
}

export function useQueueCooldown() {
  const [state, setState] = useState<QueueState>({
    isQueued: false,
    cooldownMs: 0,
    cooldownRemaining: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((ms: number) => {
    setState({ isQueued: true, cooldownMs: ms, cooldownRemaining: ms });
    const start = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, ms - elapsed);
      if (remaining <= 0) {
        setState({ isQueued: false, cooldownMs: 0, cooldownRemaining: 0 });
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setState((prev) => ({ ...prev, cooldownRemaining: remaining }));
      }
    }, 100);
  }, []);

  const stopCooldown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({ isQueued: false, cooldownMs: 0, cooldownRemaining: 0 });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { ...state, startCooldown, stopCooldown };
}
