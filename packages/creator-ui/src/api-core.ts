import { readApiErrorMessage } from "./api-errors";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

export type ApiFetcher = <T>(path: string, options?: ApiFetchOptions) => Promise<T>;

/** Shared transport without browser or server session dependencies. */
export function apiRequest(
  path: string,
  accessToken?: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(response.status, await readApiErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
