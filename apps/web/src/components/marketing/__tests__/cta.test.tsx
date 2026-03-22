import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CTA } from "../cta";

describe("CTA", () => {
  it("renders headline and subheadline from props", () => {
    render(
      <CTA ctaText="Start Now" headline="Ready?" subheadline="Join thousands." />,
    );
    expect(screen.getByText("Ready?")).toBeTruthy();
    expect(screen.getByText("Join thousands.")).toBeTruthy();
  });

  it("renders CTA button with correct text", () => {
    render(
      <CTA ctaText="Get Started" headline="Go" subheadline="Sub" />,
    );
    const link = screen.getByRole("link", { name: /get started/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/sign-up");
  });

  it("renders free-to-start subtext", () => {
    render(
      <CTA ctaText="Go" headline="H" subheadline="S" />,
    );
    expect(screen.getByText(/free to start/i)).toBeTruthy();
  });
});
