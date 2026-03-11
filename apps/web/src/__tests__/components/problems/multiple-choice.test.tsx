import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultipleChoice } from "@/components/app/problems/multiple-choice";

const problem = {
  id: "p1",
  questionText: "What is the primary duty of a firefighter?",
  type: "multiple_choice" as const,
  options: [
    { id: "a", text: "Saving lives" },
    { id: "b", text: "Writing reports" },
    { id: "c", text: "Cooking meals" },
    { id: "d", text: "Washing trucks" },
  ],
  difficulty: 3,
};

describe("MultipleChoice", () => {
  it("renders question text and all options", () => {
    render(<MultipleChoice problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText("What is the primary duty of a firefighter?")).toBeTruthy();
    expect(screen.getByText("Saving lives")).toBeTruthy();
    expect(screen.getByText("Writing reports")).toBeTruthy();
    expect(screen.getByText("Cooking meals")).toBeTruthy();
    expect(screen.getByText("Washing trucks")).toBeTruthy();
  });

  it("submit button is disabled until an option is selected", () => {
    render(<MultipleChoice problem={problem} onSubmit={vi.fn()} />);
    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeDisabled();
  });

  it("calls onSubmit with selected option id", () => {
    const onSubmit = vi.fn();
    render(<MultipleChoice problem={problem} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Saving lives"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith("a");
  });

  it("disables interaction when disabled prop is true", () => {
    render(<MultipleChoice problem={problem} onSubmit={vi.fn()} disabled />);
    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeDisabled();
  });

  it("shows feedback when provided", () => {
    render(
      <MultipleChoice
        problem={problem}
        onSubmit={vi.fn()}
        feedback={{ wasCorrect: true, correctAnswer: "a" }}
        disabled
      />
    );
    expect(screen.getByText(/correct/i)).toBeTruthy();
  });
});
