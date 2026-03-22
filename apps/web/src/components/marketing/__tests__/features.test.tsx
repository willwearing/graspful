import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Features } from "../features";

const features = [
  { title: "Audio-First", description: "Listen anywhere.", icon: "Headphones", wide: true },
  { title: "Adaptive", description: "AI focuses on gaps.", icon: "Brain" },
  { title: "Spaced", description: "Timed reviews.", icon: "Timer" },
  { title: "Coverage", description: "Full exam scope.", icon: "Shield", wide: true },
];

describe("Features", () => {
  it("renders section heading and subheading from props", () => {
    render(
      <Features heading="Why It Works" subheading="Turn dead time into study time." features={features} />,
    );
    expect(screen.getByText("Why It Works")).toBeTruthy();
    expect(screen.getByText("Turn dead time into study time.")).toBeTruthy();
  });

  it("renders all feature cards", () => {
    render(
      <Features heading="Why" subheading="Sub" features={features} />,
    );
    expect(screen.getByText("Audio-First")).toBeTruthy();
    expect(screen.getByText("Coverage")).toBeTruthy();
  });

  it("applies wide class to features with wide=true", () => {
    const { container } = render(
      <Features heading="Why" subheading="Sub" features={features} />,
    );
    const wideCards = container.querySelectorAll("[data-wide='true']");
    expect(wideCards.length).toBe(2);
  });
});
