import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "../hero";

describe("Hero", () => {
  const props = {
    headline: "Pass Your Exam. Eyes-Free.",
    subheadline: "Audio-first adaptive learning.",
    ctaText: "Start Studying Free",
  };

  it("renders each word of headline as separate animated span", () => {
    render(<Hero {...props} />);
    const heading = screen.getByRole("heading", { level: 1 });
    const spans = heading.querySelectorAll("span.animate-word-enter");
    expect(spans.length).toBeGreaterThanOrEqual(4);
  });

  it("renders CTA with btn-gradient and glow-pulse classes", () => {
    render(<Hero {...props} />);
    const cta = screen.getByRole("link", { name: /start studying free/i });
    expect(cta.className).toContain("btn-gradient");
    expect(cta.className).toContain("glow-pulse");
  });

  it("renders 4 gradient orbs", () => {
    const { container } = render(<Hero {...props} />);
    const orbs = container.querySelectorAll("[class*='orb-']");
    expect(orbs.length).toBe(4);
  });

  it("uses 9xl font size on lg screens", () => {
    const { container } = render(<Hero {...props} />);
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("lg:text-9xl");
  });
});
