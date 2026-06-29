import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Sidebar } from "@/components/app/sidebar";
import { BrandProvider } from "@/lib/brand/context";
import { HostSurfaceProvider } from "@/lib/host-context";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { firefighterBrand } from "@/lib/brand/defaults";

const testState = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockSignOut: vi.fn(),
  mockResetPostHog: vi.fn(),
  mockPathname: "/dashboard",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => testState.mockPathname,
  useRouter: () => ({
    push: testState.mockPush,
    refresh: testState.mockRefresh,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: testState.mockSignOut,
    },
  }),
}));

vi.mock("@/lib/posthog/events", () => ({
  resetPostHog: testState.mockResetPostHog,
}));

describe("Sidebar", () => {
  beforeEach(() => {
    testState.mockPathname = "/dashboard";
    testState.mockPush.mockReset();
    testState.mockRefresh.mockReset();
    testState.mockSignOut.mockReset();
    testState.mockResetPostHog.mockReset();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
        clear: () => undefined,
      },
      configurable: true,
    });
  });

  it("renders learner navigation with logout controls", () => {
    render(
      <ThemeProvider>
        <HostSurfaceProvider surface="local">
          <BrandProvider brand={firefighterBrand}>
            <Sidebar isOpen={false} onClose={() => {}} />
          </BrandProvider>
        </HostSurfaceProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /browse/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /settings/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy();
  });

  it("updates the active nav item immediately when a new route is clicked", () => {
    render(
      <ThemeProvider>
        <HostSurfaceProvider surface="local">
          <BrandProvider brand={firefighterBrand}>
            <Sidebar isOpen={false} onClose={() => {}} />
          </BrandProvider>
        </HostSurfaceProvider>
      </ThemeProvider>,
    );

    const browseLink = screen.getByRole("link", { name: /browse/i });

    fireEvent.click(browseLink);

    expect(browseLink.className).toContain("bg-primary/10");
    expect(browseLink.className).toContain("text-primary");
  });

  it("shows learn-specific navigation on platform learner routes", () => {
    testState.mockPathname = "/learn/posthog-tam/academies/posthog-tam";

    render(
      <ThemeProvider>
        <HostSurfaceProvider surface="platform">
          <BrandProvider brand={firefighterBrand}>
            <Sidebar isOpen={false} onClose={() => {}} />
          </BrandProvider>
        </HostSurfaceProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /learning hub/i })).toHaveAttribute(
      "href",
      "/learn/posthog-tam",
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.queryByRole("link", { name: /dashboard/i })).toBeNull();
  });

  it("resets PostHog identity state when signing out", async () => {
    render(
      <ThemeProvider>
        <HostSurfaceProvider surface="local">
          <BrandProvider brand={firefighterBrand}>
            <Sidebar isOpen={false} onClose={() => {}} />
          </BrandProvider>
        </HostSurfaceProvider>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(testState.mockSignOut).toHaveBeenCalled();
    await waitFor(() => expect(testState.mockResetPostHog).toHaveBeenCalled());
  });
});
