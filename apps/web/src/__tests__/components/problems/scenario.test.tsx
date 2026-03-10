import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Scenario } from "@/components/app/problems/scenario";

const problem = {
  id: "p1",
  questionText: "You arrive at a structure fire with smoke showing from the second floor. The incident commander asks you to perform a primary search. What is your first action?",
  type: "scenario" as const,
  options: [
    { id: "a", text: "Force entry through the front door" },
    { id: "b", text: "Size up the building and report conditions" },
    { id: "c", text: "Begin ventilation" },
    { id: "d", text: "Connect to the standpipe" },
  ],
  difficulty: 5,
};

describe("Scenario", () => {
  it("renders the context paragraph and options", () => {
    render(<Scenario problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText(/structure fire with smoke/)).toBeTruthy();
    expect(screen.getByText("Size up the building and report conditions")).toBeTruthy();
  });

  it("calls onSubmit with selected option id", () => {
    const onSubmit = vi.fn();
    render(<Scenario problem={problem} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Size up the building and report conditions"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith("b");
  });
});
