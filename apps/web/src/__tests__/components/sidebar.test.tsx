import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/app/sidebar";
import { BrandProvider } from "@/lib/brand/context";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { firefighterBrand } from "@/lib/brand/defaults";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("Sidebar", () => {
  beforeEach(() => {
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

  it("renders course navigation without account controls in the footer", () => {
    render(
      <ThemeProvider>
        <BrandProvider brand={firefighterBrand}>
          <Sidebar isOpen={false} onClose={() => {}} />
        </BrandProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /browse/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /settings/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
  });

  it("updates the active nav item immediately when a new route is clicked", () => {
    render(
      <ThemeProvider>
        <BrandProvider brand={firefighterBrand}>
          <Sidebar isOpen={false} onClose={() => {}} />
        </BrandProvider>
      </ThemeProvider>,
    );

    const browseLink = screen.getByRole("link", { name: /browse/i });

    fireEvent.click(browseLink);

    expect(browseLink.className).toContain("bg-primary/10");
    expect(browseLink.className).toContain("text-primary");
  });
});
