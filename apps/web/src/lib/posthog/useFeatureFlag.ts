"use client";

import { useEffect, useState } from "react";
import { initPostHog, posthog } from "./client";

export type FeatureFlagVariant = string | boolean | undefined;

/**
 * Returns the assigned boolean or multivariate value for a feature flag.
 * Reading the value emits PostHog's standard feature-flag exposure event.
 */
export function useFeatureFlagVariant(flag: string): FeatureFlagVariant {
  const [variant, setVariant] = useState<FeatureFlagVariant>(undefined);

  useEffect(() => {
    initPostHog();

    const updateVariant = () => {
      setVariant(posthog.getFeatureFlag(flag));
    };
    const unsubscribe = posthog.onFeatureFlags(updateVariant);

    if (posthog.__loaded) {
      updateVariant();
    }

    return typeof unsubscribe === "function" ? unsubscribe : undefined;
  }, [flag]);

  return variant;
}

/**
 * Lightweight wrapper around posthog.isFeatureEnabled().
 * Returns `false` until the SDK loads and evaluates the flag.
 */
export function useFeatureFlag(flag: string): boolean {
  return Boolean(useFeatureFlagVariant(flag));
}
