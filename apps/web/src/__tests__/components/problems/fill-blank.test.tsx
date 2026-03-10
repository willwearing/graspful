import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FillBlank } from "@/components/app/problems/fill-blank";

const problem = {
  id: "p1",
  questionText: "The flash point of gasoline is approximately _____ degrees Fahrenheit.",
  type: "fill_blank" as const,
  difficulty: 3,
};

describe("FillBlank", () => {
  it("renders question text and an input", () => {
    render(<FillBlank problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText(/flash point of gasoline/)).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("submit is disabled when input is empty", () => {
    render(<FillBlank problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("calls onSubmit with trimmed input value", () => {
    const onSubmit = vi.fn();
    render(<FillBlank problem={problem} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  -45  " } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith("-45");
  });
});
