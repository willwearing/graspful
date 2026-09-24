import "server-only";
import { apiRequest, readApiResponse, type ApiFetchOptions, type ApiFetcher } from "./api-core";

interface ServerSessionClient {
  auth: {
    getUser(): Promise<{ data: { user: unknown | null } }>;
    getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
  };
}

/** The caller supplies a token only after verifying its user. */
export function createApiFetcher(accessToken?: string): ApiFetcher {
  return async <T>(path: string, options?: ApiFetchOptions): Promise<T> => {
    const response = await apiRequest(path, accessToken, {
      method: options?.method ?? "GET",
      ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      cache: "no-store",
    });
    return readApiResponse<T>(response);
  };
}

/** Verify the cookie session before forwarding credentials to the API. */
export function createServerApiFetch(createSupabaseClient: () => Promise<ServerSessionClient>): ApiFetcher {
  return async <T>(path: string, options?: ApiFetchOptions): Promise<T> => {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    let accessToken: string | undefined;
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token;
    }
    return createApiFetcher(accessToken)<T>(path, options);
  };
}
