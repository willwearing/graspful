import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  timeLimitMs: number;
  onExpire: () => void;
  autoStart?: boolean;
}

export function useTimer({ timeLimitMs, onExpire, autoStart = true }: UseTimerOptions) {
  const [remainingMs, setRemainingMs] = useState(Math.max(0, timeLimitMs));
  const [isRunning, setIsRunning] = useState(autoStart);
  const onExpireRef = useRef(onExpire);
  const [initialDeadline] = useState(() => Date.now() + Math.max(0, timeLimitMs));
  const deadlineRef = useRef(initialDeadline);
  const remainingRef = useRef(Math.max(0, timeLimitMs));
  const expiredRef = useRef(false);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!isRunning) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    function updateRemainingTime() {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      remainingRef.current = remaining;
      setRemainingMs(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        setIsRunning(false);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
      }
    }

    if (deadlineRef.current <= Date.now()) updateRemainingTime();
    else interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const stop = useCallback(() => {
    remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    setRemainingMs(remainingRef.current);
    setIsRunning(false);
  }, []);
  const start = useCallback(() => {
    deadlineRef.current = Date.now() + remainingRef.current;
    setIsRunning(true);
  }, []);

  return { remainingMs, isRunning, stop, start };
}
