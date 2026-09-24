"use client";

import { useBrowserSession } from "@graspful/creator-ui/use-browser-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useAuthSession() {
  return useBrowserSession(createSupabaseBrowserClient);
}

export function useAuthToken(): string | null {
  return useAuthSession()?.access_token ?? null;
}
