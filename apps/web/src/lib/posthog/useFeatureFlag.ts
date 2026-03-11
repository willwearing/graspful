"use client";

import { useEffect, useState } from "react";
import { posthog } from "./client";

/**
 * Lightweight wrapper around posthog.isFeatureEnabled().
 * Returns `false` until the SDK loads and evaluates the flag.
 */
export function useFeatureFlag(flag: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !posthog.__loaded) return;

    // Evaluate once flags are ready (they may already be cached)
    posthog.onFeatureFlags(() => {
      setEnabled(!!posthog.isFeatureEnabled(flag));
    });
  }, [flag]);

  return enabled;
}
