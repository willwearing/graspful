import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createApiFetcher } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Verify once per server render and share the session with its data loaders. */
export const requireAppSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/sign-in");

  return { user, token, fetcher: createApiFetcher(token), brand: await resolvePageBrand() };
});
