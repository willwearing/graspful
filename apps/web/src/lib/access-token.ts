"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getBrowserSession() {
  const { data, error } = await createSupabaseBrowserClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Read the current browser session each time. Never retain tokens across users. */
export async function getAccessToken(): Promise<string> {
  return (await getBrowserSession())?.access_token ?? "";
}
