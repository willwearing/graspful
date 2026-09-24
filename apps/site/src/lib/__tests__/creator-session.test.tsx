import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatorLayout from "@/app/(app)/creator/layout";
import CreatorDashboardPage from "@/app/(app)/creator/page";

const { getUser, getSession, fetcher, cookie } = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), fetcher: vi.fn(), cookie: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser, getSession } }) }));
vi.mock("@/lib/api", () => ({ createApiFetcher: () => fetcher }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookie }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/contexts/creator-org-context", () => ({
  CreatorOrgProvider: ({ orgSlug }: { orgSlug: string }) => <p>Organization: {orgSlug}</p>,
}));
vi.mock("@/components/creator/stat-card", () => ({ StatCard: () => null }));
vi.mock("@/components/creator/course-list", () => ({ CourseList: () => null }));

const orgs = [
  { orgId: "a", slug: "first", name: "First", role: "owner", isActive: true },
  { orgId: "b", slug: "selected", name: "Selected", role: "admin", isActive: true },
  { orgId: "c", slug: "member-only", name: "Member", role: "member", isActive: true },
];
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "creator" } } });
  getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
  cookie.mockReturnValue({ value: "selected" });
  fetcher.mockImplementation(async (path: string) => {
    if (path === "/users/me/orgs") return orgs;
    if (path.endsWith("/stats")) return { students: 3, avgCompletion: 50, totalRevenue: 0 };
    return [];
  });
});

it("uses the same eligible cookie selection in the site provider and dashboard requests", async () => {
  render(await CreatorLayout({ children: null }));
  expect(screen.getByText("Organization: selected")).toBeVisible();
  await CreatorDashboardPage();
  expect(fetcher).toHaveBeenCalledWith("/orgs/selected/creator/stats");
  expect(fetcher).toHaveBeenCalledWith("/orgs/selected/courses");
});

it.each(["member-only", "another-account", "unknown"])("rejects a cookie outside creator memberships: %s", async (slug) => {
  cookie.mockReturnValue({ value: slug });
  await CreatorDashboardPage();
  expect(fetcher).toHaveBeenCalledWith("/orgs/first/creator/stats");
});

it("requires a verified user before reading a token or memberships", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  await expect(CreatorDashboardPage()).rejects.toThrow("redirect:/sign-in");
  expect(getSession).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("requires a token before rendering the creator layout", async () => {
  getSession.mockResolvedValue({ data: { session: null } });
  await expect(CreatorLayout({ children: null })).rejects.toThrow("redirect:/sign-in");
  expect(fetcher).not.toHaveBeenCalled();
});
