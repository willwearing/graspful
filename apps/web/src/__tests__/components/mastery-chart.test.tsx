import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MasteryChart } from "@/components/app/mastery-chart";

describe("MasteryChart", () => {
  it("renders mastery breakdown with correct counts", () => {
    render(
      <MasteryChart
        mastered={5}
        inProgress={3}
        needsReview={2}
        unstarted={10}
        totalConcepts={20}
      />
    );
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText(/mastered/i)).toBeTruthy();
  });

  it("renders progress bar segments", () => {
    const { container } = render(
      <MasteryChart
        mastered={5}
        inProgress={3}
        needsReview={2}
        unstarted={10}
        totalConcepts={20}
      />
    );
    // Should have 4 colored segments in the bar
    const segments = container.querySelectorAll("[data-segment]");
    expect(segments.length).toBe(4);
  });

  it("handles zero total gracefully", () => {
    render(
      <MasteryChart
        mastered={0}
        inProgress={0}
        needsReview={0}
        unstarted={0}
        totalConcepts={0}
      />
    );
    expect(screen.getByText(/no concepts/i)).toBeTruthy();
  });
});
