import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "../hero";

describe("Hero", () => {
  const props = {
    headline: "Practice Firefighter I topics.",
    subheadline: "Lessons, questions, and scheduled review.",
    ctaText: "Create free account",
  };
  it("renders the supplied subject headline and copy", () => {
    render(<Hero {...props} />);
    expect(screen.getByRole("heading", { level: 1, name: props.headline })).toBeInTheDocument();
    expect(screen.getByText(props.subheadline)).toBeInTheDocument();
  });
  it("links its primary authoring action to the quickstart", () => {
    render(<Hero {...props} />);
    expect(screen.getByRole("link", { name: props.ctaText })).toHaveAttribute("href", "/docs/quickstart");
  });
});
