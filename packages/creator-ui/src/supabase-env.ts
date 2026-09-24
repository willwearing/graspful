/** Direct public environment references are replaced by Next.js in browser builds. */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured for this environment");
  return env;
}
