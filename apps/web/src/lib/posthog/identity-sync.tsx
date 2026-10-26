"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { initPostHog, posthog } from "./client";

/**
 * Identifies the signed-in Supabase user in PostHog.
 *
 * Rendered by the signed-in app shell, not the root layout, so marketing pages
 * do not download the Supabase client. posthog-js persists the identity, so
 * later marketing visits keep it.
 */
export function PostHogIdentitySync() {
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
