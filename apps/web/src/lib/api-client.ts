import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { ApiError, apiRequest, readApiResponse } from "@/lib/api-core";

export { ApiError } from "@/lib/api-core";

/**
 * Client-side API fetch with automatic token refresh on 401.
 * Refreshed credentials belong to this call only.
 */
export async function apiClientFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);
  const distinctId = posthog.get_distinct_id?.();
  if (distinctId) headers.set("x-posthog-distinct-id", distinctId);
  const sessionId = posthog.get_session_id?.();
  if (sessionId) headers.set("x-posthog-session-id", sessionId);

  const doFetch = (t: string) =>
    apiRequest(path, t, {
      ...options,
      headers,
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    // Attempt a silent token refresh
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.refreshSession();
    const newToken = data.session?.access_token;

    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  if (res.status === 401) {
    const redirectPath = encodeURIComponent(window.location.pathname);
    window.location.href = `/sign-in?redirect=${redirectPath}&reason=session_expired`;
    throw new ApiError(401, "Session expired");
  }

  return readApiResponse<T>(res);
}
