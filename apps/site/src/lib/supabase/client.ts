"use client";

import { createBrowserClient } from "@supabase/ssr";

function getSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function hasSupabaseBrowserEnv() {
  return getSupabaseBrowserEnv() !== null;
}

export function createSupabaseBrowserClient() {
  const env = getSupabaseBrowserEnv();
  if (!env) {
    throw new Error("Supabase is not configured for this environment");
  }

  return createBrowserClient(
    env.url,
    env.anonKey
  );
}
