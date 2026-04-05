import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandThemeStyle } from "@/lib/brand/theme-style";
import type { BrandConfig } from "@/lib/brand/config";
import { firefighterBrand } from "@/lib/brand/defaults";

describe("BrandThemeStyle", () => {
  it("renders a style tag with brand CSS variables", () => {
    const { container } = render(<BrandThemeStyle brand={firefighterBrand} />);
    const style = container.querySelector("style");
    expect(style).toBeTruthy();
    expect(style!.textContent).toContain("--primary: hsl(16 100% 50%)");
    expect(style!.textContent).toContain("--radius: 0.5rem");
  });

  it("includes both light and dark mode variables", () => {
    const { container } = render(<BrandThemeStyle brand={firefighterBrand} />);
    const css = container.querySelector("style")!.textContent!;
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
  });

  it("renders gradient CSS variables from brand theme", () => {
    const { container } = render(<BrandThemeStyle brand={firefighterBrand} />);
    const css = container.querySelector("style")!.textContent!;
    expect(css).toContain("--gradient-start: #DC2626");
    expect(css).toContain("--gradient-mid: #EF4444");
    expect(css).toContain("--gradient-end: #F97316");
    expect(css).toContain("--gradient-accent: #FBBF24");
  });

  it("does not crash when gradient is missing and uses fallback values", () => {
    const brandWithoutGradient = {
      ...firefighterBrand,
      theme: {
        ...firefighterBrand.theme,
        gradient: undefined as unknown as BrandConfig["theme"]["gradient"],
      },
    };
    const { container } = render(<BrandThemeStyle brand={brandWithoutGradient} />);
    const css = container.querySelector("style")!.textContent!;
    expect(css).toContain("--gradient-start:");
    expect(css).not.toContain("undefined");
  });
});
