import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Matching } from "@/components/app/problems/matching";

const problem = {
  id: "p1",
  questionText: "Match each tool to its primary use:",
  type: "matching" as const,
  pairs: [
    { left: "Halligan bar", right: "Forcible entry" },
    { left: "Pike pole", right: "Pulling ceilings" },
    { left: "Thermal camera", right: "Finding victims" },
  ],
  difficulty: 3,
};

describe("Matching", () => {
  it("renders question and all left items", () => {
    render(<Matching problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByText("Match each tool to its primary use:")).toBeTruthy();
    expect(screen.getByText("Halligan bar")).toBeTruthy();
    expect(screen.getByText("Pike pole")).toBeTruthy();
    expect(screen.getByText("Thermal camera")).toBeTruthy();
  });

  it("renders select dropdowns for each left item", () => {
    render(<Matching problem={problem} onSubmit={vi.fn()} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBe(3);
  });

  it("submit is disabled until all items are matched", () => {
    render(<Matching problem={problem} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("calls onSubmit with mapping when all matched", () => {
    const onSubmit = vi.fn();
    render(<Matching problem={problem} onSubmit={onSubmit} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "Forcible entry" } });
    fireEvent.change(selects[1], { target: { value: "Pulling ceilings" } });
    fireEvent.change(selects[2], { target: { value: "Finding victims" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      "Halligan bar": "Forcible entry",
      "Pike pole": "Pulling ceilings",
      "Thermal camera": "Finding victims",
    });
  });
});
