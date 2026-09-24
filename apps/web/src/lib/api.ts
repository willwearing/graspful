import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiRequest, readApiResponse, type ApiFetchOptions, type ApiFetcher } from "@/lib/api-core";
export { ApiError, type ApiFetchOptions, type ApiFetcher } from "@/lib/api-core";

async function apiFetchWithAccessToken<T>(
  path: string,
  accessToken?: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const res = await apiRequest(path, accessToken, {
    method: options?.method ?? "GET",
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });

  return readApiResponse<T>(res);
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
