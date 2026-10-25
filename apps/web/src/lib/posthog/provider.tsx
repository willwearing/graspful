"use client";

import { Suspense, useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useBrand } from "@/lib/brand/context";
import { useHostSurface } from "@/lib/host-context";
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
  const brandId = useBrand().id;
  const hostSurface = useHostSurface();

  // A layout effect runs before the child effects that capture the first
  // pageview, so no event keeps a value persisted by another subdomain.
  useLayoutEffect(() => {
    initPostHog();
    if (!posthog.__loaded) return;
    posthog.register({ host_surface: hostSurface, brand_id: brandId });
  }, [brandId, hostSurface]);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PostHogPageviewTracker />
      </Suspense>
    </>
  );
}
