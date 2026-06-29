import posthog from "posthog-js";

const serviceVersion = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (posthog.__loaded) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
    person_profiles: "identified_only",
    capture_pageview: false, // We capture manually for SPA navigation
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
    enable_heatmaps: true,
    logs: {
      serviceName: "graspful-web",
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
      ...(serviceVersion ? { serviceVersion } : {}),
    },
    defaults: "2026-01-30",
  });
}

export { posthog };
