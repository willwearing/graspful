import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  timeLimitMs: number;
  onExpire: () => void;
  autoStart?: boolean;
}

export function useTimer({ timeLimitMs, onExpire, autoStart = true }: UseTimerOptions) {
  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning || remainingMs <= 0) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          setIsRunning(false);
          onExpireRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remainingMs]);

  const stop = useCallback(() => setIsRunning(false), []);
  const start = useCallback(() => setIsRunning(true), []);

  return { remainingMs, isRunning, stop, start };
}
