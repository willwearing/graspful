import posthog from "posthog-js";

const serviceVersion = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

/** Flag values (and a first-visit distinct ID) evaluated during server rendering. */
export interface PostHogBootstrap {
  distinctID?: string;
  featureFlags: Record<string, string | boolean>;
}

/** Server-rendered pages set this before hydration so init can bootstrap from it. */
export const POSTHOG_BOOTSTRAP_GLOBAL = "__GRASPFUL_POSTHOG_BOOTSTRAP__";

function readBootstrap(): PostHogBootstrap | undefined {
  const value = (window as unknown as Record<string, unknown>)[POSTHOG_BOOTSTRAP_GLOBAL];
  if (!value || typeof value !== "object") return undefined;
  return value as PostHogBootstrap;
}

export function initPostHog(serviceName = "graspful-web") {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (posthog.__loaded) return;

  const bootstrap = readBootstrap();

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
    person_profiles: "identified_only",
    capture_pageview: false, // We capture manually for SPA navigation
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
    enable_heatmaps: true,
    logs: {
      serviceName,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
      ...(serviceVersion ? { serviceVersion } : {}),
    },
    defaults: "2026-01-30",
    ...(bootstrap ? { bootstrap } : {}),
  });
}

export { posthog };
