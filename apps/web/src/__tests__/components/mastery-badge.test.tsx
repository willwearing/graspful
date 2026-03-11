import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MasteryBadge } from "@/components/app/mastery-badge";

describe("MasteryBadge", () => {
  it("renders 'Not Started' for unstarted state", () => {
    render(<MasteryBadge state="unstarted" />);
    expect(screen.getByText("Not Started")).toBeTruthy();
  });

  it("renders 'In Progress' for in_progress state", () => {
    render(<MasteryBadge state="in_progress" />);
    expect(screen.getByText("In Progress")).toBeTruthy();
  });

  it("renders 'Mastered' for mastered state", () => {
    render(<MasteryBadge state="mastered" />);
    expect(screen.getByText("Mastered")).toBeTruthy();
  });

  it("renders 'Review' for needs_review state", () => {
    render(<MasteryBadge state="needs_review" />);
    expect(screen.getByText("Review")).toBeTruthy();
  });
});
