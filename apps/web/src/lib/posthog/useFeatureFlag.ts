"use client";

import { useEffect, useState } from "react";
import { initPostHog, posthog } from "./client";

export type FeatureFlagVariant = string | boolean | undefined;

interface FeatureFlagVariantOptions {
  fallbackAfterMs: number;
  fallbackVariant: Exclude<FeatureFlagVariant, undefined>;
}

/**
 * Returns the assigned boolean or multivariate value for a feature flag.
 * Reading the value emits PostHog's standard feature-flag exposure event.
 */
export function useFeatureFlagVariant(
  flag: string,
  options?: FeatureFlagVariantOptions,
): FeatureFlagVariant {
  const [variant, setVariant] = useState<FeatureFlagVariant>(undefined);
  const fallbackAfterMs = options?.fallbackAfterMs;
  const fallbackVariant = options?.fallbackVariant;

  useEffect(() => {
    initPostHog();

    let settled = false;
    let fallbackTimer: number | undefined;
    const listener = { unsubscribe: undefined as (() => void) | undefined };

    const settle = (nextVariant: FeatureFlagVariant) => {
      if (settled || nextVariant === undefined) return;

      settled = true;
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
      }
      listener.unsubscribe?.();
      setVariant(nextVariant);
    };

    const updateVariant = () => {
      if (settled) return;
      settle(posthog.getFeatureFlag(flag));
    };
    listener.unsubscribe = posthog.onFeatureFlags(updateVariant);

    if (posthog.__loaded) {
      updateVariant();
    }

    if (settled) {
      listener.unsubscribe?.();
    } else if (fallbackAfterMs !== undefined && fallbackVariant !== undefined) {
      fallbackTimer = window.setTimeout(
        () => settle(fallbackVariant),
        fallbackAfterMs,
      );
    }

    return () => {
      settled = true;
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
      }
      listener.unsubscribe?.();
    };
  }, [flag, fallbackAfterMs, fallbackVariant]);

  return variant;
}

/**
 * Lightweight wrapper around posthog.isFeatureEnabled().
 * Returns `false` until the SDK loads and evaluates the flag.
 */
export function useFeatureFlag(flag: string): boolean {
  return Boolean(useFeatureFlagVariant(flag));
}
