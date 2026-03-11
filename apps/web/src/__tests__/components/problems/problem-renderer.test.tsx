import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProblemRenderer } from "@/components/app/problems/problem-renderer";

describe("ProblemRenderer", () => {
  it("renders MultipleChoice for multiple_choice type", () => {
    const problem = {
      id: "p1",
      questionText: "Test question?",
      type: "multiple_choice" as const,
      options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
      difficulty: 3,
    };
    render(<ProblemRenderer problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText("Test question?")).toBeTruthy();
    expect(screen.getByText("Option A")).toBeTruthy();
  });

  it("renders TrueFalse for true_false type", () => {
    const problem = {
      id: "p2",
      questionText: "Fire is hot?",
      type: "true_false" as const,
      difficulty: 1,
    };
    render(<ProblemRenderer problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText("Fire is hot?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /true/i })).toBeTruthy();
  });

  it("shows unsupported message for unknown type", () => {
    const problem = {
      id: "p3",
      questionText: "Unknown",
      type: "unknown_type" as any,
      difficulty: 1,
    };
    render(<ProblemRenderer problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText(/unsupported/i)).toBeTruthy();
  });
});
