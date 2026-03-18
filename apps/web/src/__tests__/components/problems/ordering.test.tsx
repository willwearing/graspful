import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Ordering } from "@/components/app/problems/ordering";

const problem = {
  id: "p1",
  questionText: "Place these fire attack steps in order:",
  type: "ordering" as const,
  items: ["Stretch hoseline", "Secure water supply", "Force entry", "Advance to seat of fire"],
  difficulty: 4,
};

describe("Ordering", () => {
  it("renders question and all items", () => {
    render(<Ordering problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText("Place these fire attack steps in order:")).toBeTruthy();
    expect(screen.getByText("Stretch hoseline")).toBeTruthy();
    expect(screen.getByText("Secure water supply")).toBeTruthy();
  });

  it("falls back to options when ordering items were serialized incorrectly", () => {
    render(
      <Ordering
        problem={{
          ...problem,
          items: undefined,
          options: [
            { id: "1", text: "Inspect source" },
            { id: "2", text: "Normalize levels" },
          ],
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Inspect source")).toBeTruthy();
    expect(screen.getByText("Normalize levels")).toBeTruthy();
  });

  it("renders move-up and move-down buttons for each item", () => {
    render(<Ordering problem={problem} onSubmit={vi.fn()} />);
    const upButtons = screen.getAllByRole("button", { name: /move up/i });
    const downButtons = screen.getAllByRole("button", { name: /move down/i });
    expect(upButtons.length).toBe(4);
    expect(downButtons.length).toBe(4);
  });

  it("calls onSubmit with current item order", () => {
    const onSubmit = vi.fn();
    render(<Ordering problem={problem} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith([
      "Stretch hoseline",
      "Secure water supply",
      "Force entry",
      "Advance to seat of fire",
    ]);
  });

  it("moves an item up when move-up is clicked", () => {
    const onSubmit = vi.fn();
    render(<Ordering problem={problem} onSubmit={onSubmit} />);
    // Move "Secure water supply" (index 1) up to index 0
    const upButtons = screen.getAllByRole("button", { name: /move up/i });
    fireEvent.click(upButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith([
      "Secure water supply",
      "Stretch hoseline",
      "Force entry",
      "Advance to seat of fire",
    ]);
  });
});
