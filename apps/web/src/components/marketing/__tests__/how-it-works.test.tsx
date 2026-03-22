import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HowItWorks } from "../how-it-works";

const steps = [
  { title: "Take a Diagnostic", description: "Quick quiz." },
  { title: "Study Adaptively", description: "Personalized lessons." },
  { title: "Pass Your Exam", description: "Retain everything." },
];

describe("HowItWorks", () => {
  it("renders heading from props", () => {
    render(<HowItWorks heading="How It Works" steps={steps} />);
    expect(screen.getByText("How It Works")).toBeTruthy();
  });

  it("renders all step titles and descriptions", () => {
    render(<HowItWorks heading="How It Works" steps={steps} />);
    expect(screen.getByText("Take a Diagnostic")).toBeTruthy();
    expect(screen.getByText("Quick quiz.")).toBeTruthy();
    expect(screen.getByText("Study Adaptively")).toBeTruthy();
    expect(screen.getByText("Personalized lessons.")).toBeTruthy();
    expect(screen.getByText("Pass Your Exam")).toBeTruthy();
    expect(screen.getByText("Retain everything.")).toBeTruthy();
  });

  it("uses dark navy background", () => {
    const { container } = render(<HowItWorks heading="How It Works" steps={steps} />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-[#0A1628]");
  });
});
