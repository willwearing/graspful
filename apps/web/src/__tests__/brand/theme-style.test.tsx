import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandThemeStyle } from "@/lib/brand/theme-style";
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
});
