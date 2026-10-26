import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";
import { HOMEPAGE_PRODUCT_PROOF_FLAG } from "@/lib/experiments/homepage";
import { LandingHeroExperiment } from "../landing-hero-experiment";

const useFeatureFlagVariant = vi.hoisted(() => vi.fn());

vi.mock("@/lib/posthog/useFeatureFlag", () => ({
  useFeatureFlagVariant,
}));

const props = {
  headline: "Build courses where students actually learn.",
  subheadline: "Current homepage copy.",
  ctaText: "Start Building Free",
};

function renderExperiment(variant: string | true | null) {
  useFeatureFlagVariant.mockReset();
  return render(
    <BrandProvider brand={defaultBrand}>
      <LandingHeroExperiment variant={variant} {...props} />
    </BrandProvider>,
  );
}

describe("LandingHeroExperiment", () => {
  it("renders the hero visibly on first render, with no loading placeholder", () => {
    const { container } = renderExperiment("control");

    expect(container.querySelector('[data-landing-variant="loading"]')).toBeNull();
    expect(container.querySelector(".invisible")).toBeNull();
    expect(screen.getByText("Current homepage copy.")).toBeVisible();
  });

  it("keeps the existing hero for the control variant and records exposure", () => {
    renderExperiment("control");

    expect(useFeatureFlagVariant).toHaveBeenCalledWith(HOMEPAGE_PRODUCT_PROOF_FLAG);
    expect(screen.getByText("Current homepage copy.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Start Building Free" }),
    ).toHaveAttribute("href", "/docs/quickstart");
  });

  it("shows concrete product proof for the challenger variant", () => {
    renderExperiment("product-proof");

    expect(useFeatureFlagVariant).toHaveBeenCalledWith(HOMEPAGE_PRODUCT_PROOF_FLAG);
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

  it("renders the control for an unknown variant", () => {
    renderExperiment("some-future-variant");

    expect(screen.getByText("Current homepage copy.")).toBeInTheDocument();
  });

  it("shows the control without reading the flag when the visitor is unassigned", () => {
    renderExperiment(null);

    // A fallback is not an experiment exposure.
    expect(useFeatureFlagVariant).not.toHaveBeenCalled();
    expect(screen.getByText("Current homepage copy.")).toBeInTheDocument();
  });
});
