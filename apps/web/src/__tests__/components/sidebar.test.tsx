import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/app/sidebar";
import { BrandProvider } from "@/lib/brand/context";
import { HostSurfaceProvider } from "@/lib/host-context";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { firefighterBrand } from "@/lib/brand/defaults";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignOut = vi.fn();
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockSignOut.mockReset();
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
    mockPathname = "/learn/posthog-tam/academies/posthog-tam";

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
});
