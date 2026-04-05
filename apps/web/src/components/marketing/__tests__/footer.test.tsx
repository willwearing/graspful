import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingFooter } from "../footer";
import { BrandProvider } from "@/lib/brand/context";
import { HostSurfaceProvider } from "@/lib/host-context";
import { defaultBrand, firefighterBrand } from "@/lib/brand/defaults";

describe("MarketingFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders brand name and tagline", () => {
    render(
      <HostSurfaceProvider surface="local">
        <BrandProvider brand={firefighterBrand}>
          <MarketingFooter />
        </BrandProvider>
      </HostSurfaceProvider>,
    );
    expect(screen.getByText("FirefighterPrep")).toBeTruthy();
    expect(screen.getByText(firefighterBrand.tagline)).toBeTruthy();
  });

  it("renders copyright with current year", () => {
    render(
      <HostSurfaceProvider surface="local">
        <BrandProvider brand={firefighterBrand}>
          <MarketingFooter />
        </BrandProvider>
      </HostSurfaceProvider>,
    );
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeTruthy();
  });

  it("uses direct platform links on the app surface", () => {
    render(
      <HostSurfaceProvider surface="app">
        <BrandProvider brand={defaultBrand}>
          <MarketingFooter />
        </BrandProvider>
      </HostSurfaceProvider>,
    );

    expect(screen.getByRole("link", { name: /ai agents/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^pricing$/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /documentation/i })).toBeTruthy();
  });

  it("renders an academies directory link for the graspful marketing surface", () => {
    render(
      <HostSurfaceProvider surface="local">
        <BrandProvider brand={defaultBrand}>
          <MarketingFooter />
        </BrandProvider>
      </HostSurfaceProvider>,
    );

    expect(screen.getByRole("link", { name: /^academies$/i })).toHaveAttribute(
      "href",
      "/academies",
    );
  });
});
