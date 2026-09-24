"use client";

import { useState, useEffect } from "react";
import { getBrowserSession } from "@/lib/access-token";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let authChanged = false;
    getBrowserSession().then((current) => {
      if (active && !authChanged) setSession(current);
    }).catch(() => { if (active && !authChanged) setSession(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => {
      authChanged = true;
      if (active) setSession(current);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return session;
}

export function useAuthToken(): string | null {
  return useAuthSession()?.access_token ?? null;
}
