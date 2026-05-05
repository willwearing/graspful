import posthog from "posthog-js";

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
    defaults: "2026-01-30",
  });
}

export { posthog };
