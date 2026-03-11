import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrueFalse } from "@/components/app/problems/true-false";

const problem = {
  id: "p1",
  questionText: "Water boils at 100C at sea level.",
  type: "true_false" as const,
  difficulty: 1,
};

describe("TrueFalse", () => {
  it("renders question and two buttons", () => {
    render(<TrueFalse problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText("Water boils at 100C at sea level.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /true/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /false/i })).toBeTruthy();
  });

  it("calls onSubmit with true when True is clicked", () => {
    const onSubmit = vi.fn();
    render(<TrueFalse problem={problem} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /true/i }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it("calls onSubmit with false when False is clicked", () => {
    const onSubmit = vi.fn();
    render(<TrueFalse problem={problem} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /false/i }));
    expect(onSubmit).toHaveBeenCalledWith(false);
  });

  it("disables buttons when disabled", () => {
    render(<TrueFalse problem={problem} onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /true/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /false/i })).toBeDisabled();
  });
});
