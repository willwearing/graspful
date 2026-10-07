import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";
import { HostSurfaceProvider } from "@/lib/host-context";
import type { HostSurface } from "@/lib/hosts";
import { HOMEPAGE_PRODUCT_PROOF_FLAG, LandingHeroExperiment } from "../landing-hero-experiment";

let variant: string | boolean | undefined = "control";
const useFeatureFlagVariant = vi.hoisted(() => vi.fn());

vi.mock("@/lib/posthog/useFeatureFlag", () => ({
  useFeatureFlagVariant,
}));

const props = {
  isGraspful: true,
  headline: "Build courses where students actually learn.",
  subheadline: "Current homepage copy.",
  ctaText: "Start Building Free",
};

function renderExperiment(surface: HostSurface = "platform") {
  useFeatureFlagVariant.mockReset().mockImplementation(() => variant);
  return render(
    <HostSurfaceProvider surface={surface}>
      <BrandProvider brand={defaultBrand}>
        <LandingHeroExperiment {...props} />
      </BrandProvider>
    </HostSurfaceProvider>,
  );
}

describe("LandingHeroExperiment", () => {
  it("allows two seconds for homepage assignment before using the fallback", () => {
    variant = undefined;
    renderExperiment();

    expect(useFeatureFlagVariant).toHaveBeenCalledWith(HOMEPAGE_PRODUCT_PROOF_FLAG, {
      fallbackAfterMs: 2000,
      fallbackVariant: "control",
    });
  });

  it.each<HostSurface>(["academy", "app", "local"])(
    "keeps %s hosts out of the experiment even with the Graspful brand",
    (surface) => {
      variant = "product-proof";
      renderExperiment(surface);

      expect(useFeatureFlagVariant).not.toHaveBeenCalled();
      expect(screen.getByText("Current homepage copy.")).toBeInTheDocument();
    },
  );

  it("keeps the existing hero for the control variant", () => {
    variant = "control";
    renderExperiment();

    expect(screen.getByText("Current homepage copy.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Start Building Free" }),
    ).toHaveAttribute("href", "/docs/quickstart");
  });

  it("shows concrete product proof for the challenger variant", () => {
    variant = "product-proof";
    renderExperiment();

    expect(
      screen.getByRole("heading", {
        name: "Turn source material into an adaptive course.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create your first course/i }),
    ).toHaveAttribute("href", "/docs/quickstart");
    expect(
      screen.getByRole("link", { name: /try a question/i }),
    ).toHaveAttribute("href", "#lesson-preview");
  });

  it("hides the control while assignment loads", () => {
    variant = undefined;
    const { container } = renderExperiment();

    expect(
      container.querySelector('[data-landing-variant="loading"]'),
    ).toHaveClass("invisible");
    expect(
      screen.queryByText("Turn source material into an adaptive course."),
    ).not.toBeInTheDocument();
  });
});
