import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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

/** Client-side API fetch -- pass token explicitly */
export async function apiClientFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.statusText}`);
  }

  return res.json();
}
