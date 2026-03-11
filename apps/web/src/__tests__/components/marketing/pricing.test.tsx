import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PricingSection } from "@/components/marketing/pricing";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";

function renderPricing() {
  return render(
    <BrandProvider brand={defaultBrand}>
      <PricingSection />
    </BrandProvider>,
  );
}

describe("PricingSection", () => {
  it("renders three plan cards", () => {
    renderPricing();

    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getByText("Individual")).toBeDefined();
    expect(screen.getByText("Team")).toBeDefined();
  });

  it("shows monthly pricing by default", () => {
    renderPricing();

    expect(screen.getByText("$14.99")).toBeDefined();
  });

  it("toggles to yearly pricing", () => {
    renderPricing();

    const yearlyButton = screen.getByText(/Yearly/);
    fireEvent.click(yearlyButton);

    expect(screen.getByText("$149")).toBeDefined();
  });

  it("shows Most Popular badge on Individual plan", () => {
    renderPricing();

    expect(screen.getByText("Most Popular")).toBeDefined();
  });

  it("shows trial days from brand config", () => {
    renderPricing();

    const trialButtons = screen.getAllByText(/7-Day Free Trial/);
    expect(trialButtons.length).toBeGreaterThan(0);
  });

  it("shows free plan features", () => {
    renderPricing();

    expect(screen.getByText("1 exam")).toBeDefined();
    expect(screen.getByText("50 study items")).toBeDefined();
  });
});
