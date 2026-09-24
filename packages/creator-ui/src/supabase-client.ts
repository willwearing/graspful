"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, requireSupabaseEnv } from "./supabase-env";

export function hasSupabaseBrowserEnv() {
  return getSupabaseEnv() !== null;
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
