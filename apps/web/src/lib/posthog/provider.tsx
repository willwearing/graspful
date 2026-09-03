"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog } from "./client";
import { buildPostHogPageviewUrl } from "./pageview-url";

function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
    if (!pathname || !posthog.__loaded) return;
    posthog.capture("$pageview", {
      $current_url: buildPostHogPageviewUrl(window.location),
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PostHogPageviewTracker />
      </Suspense>
    </>
  );
}
