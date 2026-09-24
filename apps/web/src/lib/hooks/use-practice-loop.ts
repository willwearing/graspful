"use client";

import { useCallback, useRef, useState } from "react";
import { useMountEffect } from "./use-mount-effect";

/** Show feedback before advancing, and cancel delayed work when the flow leaves. */
export function usePracticeLoop<Feedback>() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    settleRef.current?.();
    settleRef.current = null;
  }, []);

  useMountEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; cancel(); };
  });

  const reset = useCallback(() => {
    cancel();
    setFeedback(null);
    setAttempt((previous) => previous + 1);
  }, [cancel]);

  const present = useCallback((next: Feedback, advance: () => void | Promise<void>, delayMs = 1500) => {
    cancel();
    if (!mountedRef.current) return Promise.resolve();
    setFeedback(next);
    return new Promise<void>((resolve, reject) => {
      settleRef.current = resolve;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        settleRef.current = null;
        if (!mountedRef.current) { resolve(); return; }
        setFeedback(null);
        setAttempt((previous) => previous + 1);
        Promise.resolve().then(advance).then(resolve, reject);
      }, Math.max(1500, delayMs));
    });
  }, [cancel]);

  return { feedback, attempt, reset, present };
}
