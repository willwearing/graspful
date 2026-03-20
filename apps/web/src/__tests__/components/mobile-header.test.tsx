import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";
import { MobileHeader } from "@/components/app/mobile-header";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignOut = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

describe("MobileHeader", () => {
  beforeEach(() => {
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

  it("renders top-right theme and logout controls and signs out from the header", () => {
    const onMenuClick = vi.fn();

    render(
      <ThemeProvider>
        <BrandProvider brand={defaultBrand}>
          <MobileHeader onMenuClick={onMenuClick} />
        </BrandProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy();
    expect(screen.queryByText("WI")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(mockSignOut).toHaveBeenCalled();
  });
});
