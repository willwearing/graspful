import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PricingSection } from "@/components/marketing/pricing";
import { BrandProvider } from "@/lib/brand/context";
import { firefighterBrand, graspfulBrand, posthogBrand } from "@/lib/brand/defaults";

describe("PricingSection", () => {
  for (const brand of [firefighterBrand, graspfulBrand, posthogBrand]) {
    it(`shows current billing availability for ${brand.id}`, () => {
      render(<BrandProvider brand={brand}><PricingSection /></BrandProvider>);
      expect(screen.getByText("Paid subscriptions are not available yet.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /trial|monthly|yearly/i })).not.toBeInTheDocument();
      const cta = screen.getByRole("link", { name: "Create free account" });
      expect(cta).toHaveAttribute("href", expect.stringContaining("/sign-up"));
      expect(cta.querySelector("button")).toBeNull();
    });
  }
  it("renders the pricing page heading as h1", () => {
    render(<PricingSection headingLevel="h1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Start with a free account" })).toBeInTheDocument();
  });
});
