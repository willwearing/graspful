import { createSupabaseServerClient } from "@/lib/supabase/server";
export { ApiError, apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

export type ApiFetcher = <T>(
  path: string,
  options?: ApiFetchOptions,
) => Promise<T>;

async function apiFetchWithAccessToken<T>(
  path: string,
  accessToken?: string,
  options?: ApiFetchOptions,
): Promise<T> {
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

export function createApiFetcher(accessToken?: string): ApiFetcher {
  return async <T>(path: string, options?: ApiFetchOptions) =>
    apiFetchWithAccessToken<T>(path, accessToken, options);
}

/** Server-side API fetch with Supabase JWT attached */
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
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

  return apiFetchWithAccessToken<T>(path, accessToken, options);
}
