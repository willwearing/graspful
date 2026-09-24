import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { ApiFetcher } from "./api-core";

interface SessionClient<User> {
  auth: {
    getUser(): Promise<{ data: { user: User | null } }>;
    getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
  };
}

/** Verify once per server render before forwarding a session token. */
export function createRequiredSession<User>(
  createSupabaseClient: () => Promise<SessionClient<User>>,
  createApiFetcher: (token: string) => ApiFetcher,
) {
  return cache(async () => {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) redirect("/sign-in");
    return { user, token, fetcher: createApiFetcher(token) };
  });
}
