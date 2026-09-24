"use client";

import { useEffect, useRef } from "react";

/** Keep a stable reference to the latest committed value for async callbacks. */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}
