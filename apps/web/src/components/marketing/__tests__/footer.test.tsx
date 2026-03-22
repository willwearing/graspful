import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingFooter } from "../footer";
import { BrandProvider } from "@/lib/brand/context";
import { firefighterBrand } from "@/lib/brand/defaults";

describe("MarketingFooter", () => {
  it("renders brand name and tagline", () => {
    render(
      <BrandProvider brand={firefighterBrand}>
        <MarketingFooter />
      </BrandProvider>,
    );
    expect(screen.getByText("FirefighterPrep")).toBeTruthy();
    expect(screen.getByText(firefighterBrand.tagline)).toBeTruthy();
  });

  it("renders copyright with current year", () => {
    render(
      <BrandProvider brand={firefighterBrand}>
        <MarketingFooter />
      </BrandProvider>,
    );
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeTruthy();
  });
});
