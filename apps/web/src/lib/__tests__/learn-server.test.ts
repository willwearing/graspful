import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { resolveAcademyBySlug, resolveCourseBySlug } from "@/lib/learn-server";
import type { ApiFetcher } from "@/lib/api";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); },
  redirect: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

describe("Learner content resolution", () => {
  it.each([
    ["course", resolveCourseBySlug],
    ["academy", resolveAcademyBySlug],
  ] as const)("renders missing or inaccessible %s content as not found", async (_kind, resolve) => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(404, "Not found"));
    await expect(resolve("org", "slug", fetcher as ApiFetcher)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it.each([
    ["course", resolveCourseBySlug],
    ["academy", resolveAcademyBySlug],
  ] as const)("preserves service failures when resolving a %s", async (_kind, resolve) => {
    const failure = new ApiError(503, "Service unavailable");
    const fetcher = vi.fn().mockRejectedValue(failure);
    await expect(resolve("org", "slug", fetcher as ApiFetcher)).rejects.toBe(failure);
  });
});
