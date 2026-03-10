import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompletionEstimate } from "@/components/app/completion-estimate";

describe("CompletionEstimate", () => {
  it("renders estimated weeks remaining", () => {
    render(
      <CompletionEstimate
        completionPercent={40}
        estimatedWeeksRemaining={4.5}
        averageDailyXP={35}
        masteredConcepts={40}
        totalConcepts={100}
      />
    );
    expect(screen.getByText(/4\.5/)).toBeTruthy();
    expect(screen.getByText(/weeks/i)).toBeTruthy();
  });

  it("shows completion message when 100%", () => {
    render(
      <CompletionEstimate
        completionPercent={100}
        estimatedWeeksRemaining={0}
        averageDailyXP={35}
        masteredConcepts={100}
        totalConcepts={100}
      />
    );
    expect(screen.getByText(/complete/i)).toBeTruthy();
  });

  it("handles null estimate gracefully", () => {
    render(
      <CompletionEstimate
        completionPercent={0}
        estimatedWeeksRemaining={null}
        averageDailyXP={0}
        masteredConcepts={0}
        totalConcepts={100}
      />
    );
    expect(screen.getByText(/start studying/i)).toBeTruthy();
  });

  it("shows mastery progress fraction", () => {
    render(
      <CompletionEstimate
        completionPercent={25}
        estimatedWeeksRemaining={6}
        averageDailyXP={30}
        masteredConcepts={25}
        totalConcepts={100}
      />
    );
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText(/of 100/i)).toBeTruthy();
  });
});
