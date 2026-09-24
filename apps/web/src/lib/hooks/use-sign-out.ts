"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resetPostHog } from "@/lib/posthog/events";

export function useSignOut() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: authError } = await createSupabaseBrowserClient().auth.signOut();
      if (authError) throw authError;
      resetPostHog();
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }, [router]);
  return { signOut, error };
}
