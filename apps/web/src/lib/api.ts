import { createSupabaseServerClient } from "@/lib/supabase/server";
export { ApiError, apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";

/** Server-side API fetch with Supabase JWT attached */
export async function apiFetch<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const supabase = await createSupabaseServerClient();

  // getUser() verifies the JWT server-side; getSession() alone trusts the client
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accessToken: string | undefined;
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.statusText}`);
  }

  return res.json();
}
