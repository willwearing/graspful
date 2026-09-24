"use client";

import { useCallback, useRef, useState } from "react";
import { useLatestRef } from "./use-latest-ref";
import { useMountEffect } from "./use-mount-effect";

interface SubmissionOptions<Request, Response> {
  send: (request: Request) => Promise<Response>;
  onSuccess?: (response: Response, request: Request) => void | Promise<void>;
  errorMessage: string;
}

/** Serialize submissions and retain the exact failed request for a safe retry. */
export function useAnswerSubmission<Request, Response>(options: SubmissionOptions<Request, Response>) {
  const optionsRef = useLatestRef(options);
  const mountedRef = useRef(true);
  const pendingRequestRef = useRef<Promise<void> | null>(null);
  const retryRequestRef = useRef<{ request: Request } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMountEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  });

  const submit = useCallback((request: Request): Promise<void> => {
    if (pendingRequestRef.current) return pendingRequestRef.current;
    if (!mountedRef.current) return Promise.resolve();
    retryRequestRef.current = { request };
    setSubmitting(true);
    setError(null);
    const operation = optionsRef.current;
    const pending = Promise.resolve().then(async () => {
      try {
        const response = await operation.send(request);
        if (!mountedRef.current) return;
        retryRequestRef.current = null;
        await operation.onSuccess?.(response, request);
      } catch {
        if (mountedRef.current) setError(operation.errorMessage);
      } finally {
        pendingRequestRef.current = null;
        if (mountedRef.current) setSubmitting(false);
      }
    });
    pendingRequestRef.current = pending;
    return pending;
  }, [optionsRef]);

  const retry = useCallback(() => {
    const previous = retryRequestRef.current;
    return previous ? submit(previous.request) : Promise.resolve();
  }, [submit]);

  const clearError = useCallback(() => setError(null), []);
  return { submit, retry, submitting, error, clearError, pendingRequestRef, mountedRef };
}
