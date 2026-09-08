import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";
import { LandingHeroExperiment } from "../landing-hero-experiment";

let variant: string | boolean | undefined = "control";

vi.mock("@/lib/posthog/useFeatureFlag", () => ({
  useFeatureFlagVariant: () => variant,
}));

const props = {
  isGraspful: true,
  headline: "Build courses where students actually learn.",
  subheadline: "Current homepage copy.",
  ctaText: "Start Building Free",
};

function renderExperiment() {
  return render(
    <BrandProvider brand={defaultBrand}>
      <LandingHeroExperiment {...props} />
    </BrandProvider>,
  );
}

describe("LandingHeroExperiment", () => {
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
