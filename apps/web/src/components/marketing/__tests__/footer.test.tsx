import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MarketingFooter } from "../footer";
import { BrandProvider } from "@/lib/brand/context";
import { HostSurfaceProvider } from "@/lib/host-context";
import { defaultBrand, firefighterBrand } from "@/lib/brand/defaults";
import { getPublicAcademyCatalog } from "@/lib/public-academies";

vi.mock("@/lib/public-academies", () => ({
  getPublicAcademyCatalog: vi.fn(),
}));

describe("MarketingFooter", () => {
  beforeEach(() => {
    vi.mocked(getPublicAcademyCatalog).mockResolvedValue([]);
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

  it("renders academy links for the graspful marketing surface", async () => {
    vi.mocked(getPublicAcademyCatalog).mockResolvedValue([
      {
        slug: "posthog-tam",
        name: "PostHog TAM Academy",
        domain: "posthog-tam.vercel.app",
        orgSlug: "posthog-tam",
        academies: [],
      },
    ]);

    render(
      <HostSurfaceProvider surface="local">
        <BrandProvider brand={defaultBrand}>
          <MarketingFooter />
        </BrandProvider>
      </HostSurfaceProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Academies")).toBeTruthy();
    });

    expect(screen.getByRole("link", { name: /posthog tam academy/i })).toHaveAttribute(
      "href",
      "https://posthog-tam.vercel.app",
    );
    expect(screen.getByText("posthog-tam.vercel.app")).toBeTruthy();
  });
});
