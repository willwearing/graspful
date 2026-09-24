"use client";

import posthog from "posthog-js";
import { ApiError, apiRequest, readApiResponse } from "./api-core";

interface RefreshClient {
  auth: {
    refreshSession(): Promise<{ data: { session: { access_token: string } | null } }>;
  };
}

/** Each request owns its refreshed token. No credentials survive an account change. */
export function createBrowserApiFetcher(createSupabaseClient: () => RefreshClient) {
  return async function apiClientFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    const distinctId = posthog.get_distinct_id?.();
    if (distinctId) headers.set("x-posthog-distinct-id", distinctId);
    const sessionId = posthog.get_session_id?.();
    if (sessionId) headers.set("x-posthog-session-id", sessionId);
    const request = (accessToken: string) => apiRequest(path, accessToken, { ...options, headers });

    let response = await request(token);
    if (response.status === 401) {
      const { data } = await createSupabaseClient().auth.refreshSession();
      const refreshedToken = data.session?.access_token;
      if (refreshedToken) response = await request(refreshedToken);
    }

    if (response.status === 401) {
      const redirectPath = encodeURIComponent(window.location.pathname);
      window.location.href = `/sign-in?redirect=${redirectPath}&reason=session_expired`;
      throw new ApiError(401, "Session expired");
    }

    return readApiResponse<T>(response);
  };
}
