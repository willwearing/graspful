import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-core";
import { requireLearnAccess, resolveAcademyBySlug, resolveCourseBySlug } from "@/lib/learn-server";
import type { ApiFetcher } from "@/lib/api";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); },
  redirect: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
const { fetcher } = vi.hoisted(() => ({ fetcher: vi.fn() }));
vi.mock("@/lib/app-session", () => ({ requireAppSession: async () => ({ token: "token", fetcher }) }));

beforeEach(() => vi.clearAllMocks());

describe("learner organization access", () => {
  it.each([
    [],
    [{ slug: "other-org", isActive: true }],
    [{ slug: "org", isActive: false }],
  ])("hides organizations without active membership", async (...memberships) => {
    fetcher.mockResolvedValue(memberships);
    await expect(requireLearnAccess("org")).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("returns the authenticated fetcher for active members", async () => {
    fetcher.mockResolvedValue([{ slug: "org", isActive: true }]);
    await expect(requireLearnAccess("org")).resolves.toEqual({ token: "token", serverApiFetch: fetcher });
  });

  it("preserves membership API failures", async () => {
    const failure = new ApiError(503, "Unavailable");
    fetcher.mockRejectedValue(failure);
    await expect(requireLearnAccess("org")).rejects.toBe(failure);
  });
});

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
