"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useBrand } from "@/lib/brand/context";
import { useHostSurface } from "@/lib/host-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

function PostHogIdentitySync() {
  const lastIdentifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    initPostHog();
    const supabase = createSupabaseBrowserClient();
    const identifySession = (session: { user: { id: string } } | null) => {
      const userId = session?.user.id;
      if (
        userId &&
        posthog.__loaded &&
        lastIdentifiedUserId.current !== userId
      ) {
        posthog.identify(userId);
        lastIdentifiedUserId.current = userId;
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      identifySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      identifySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      <PostHogIdentitySync />
    </>
  );
}
