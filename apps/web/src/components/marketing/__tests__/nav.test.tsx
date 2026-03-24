import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingNav } from "../nav";
import { BrandProvider } from "@/lib/brand/context";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { firefighterBrand } from "@/lib/brand/defaults";

function renderNav() {
  return render(
    <ThemeProvider>
      <BrandProvider brand={firefighterBrand}>
        <MarketingNav />
      </BrandProvider>
    </ThemeProvider>,
  );
}

describe("MarketingNav", () => {
  it("renders brand name", () => {
    renderNav();
    expect(screen.getByText("FirefighterPrep")).toBeTruthy();
  });

  it("renders Sign In link", () => {
    renderNav();
    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(signIn).toBeTruthy();
    expect(signIn.getAttribute("href")).toBe("/sign-in");
  });

  it("renders Get Started CTA with gradient pill styling", () => {
    renderNav();
    const cta = screen.getByRole("link", { name: /get started/i });
    expect(cta).toBeTruthy();
    expect(cta.getAttribute("href")).toBe("/sign-up");
    expect(cta.className).toContain("btn-gradient");
  });
});
