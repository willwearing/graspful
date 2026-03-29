import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";

// Cache the latest valid token so subsequent calls use it after a refresh
let cachedToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Client-side API fetch with automatic token refresh on 401.
 */
export async function apiClientFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const doFetch = (t: string) =>
    fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
        ...options?.headers,
      },
    });

  const activeToken = cachedToken ?? token;
  let res = await doFetch(activeToken);

  if (res.status === 401) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.refreshSession();
    const newToken = data.session?.access_token;

    if (newToken) {
      cachedToken = newToken;
      res = await doFetch(newToken);
    }
  }

  if (res.status === 401) {
    cachedToken = null;
    const redirectPath = encodeURIComponent(window.location.pathname);
    window.location.href = `/sign-in?redirect=${redirectPath}&reason=session_expired`;
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.statusText}`);
  }

  return res.json();
}
