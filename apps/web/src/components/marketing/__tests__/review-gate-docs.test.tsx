import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QUALITY_CHECK_METADATA } from "@graspful/shared";
import ReviewGatePage from "@/app/(marketing)/docs/review-gate/page";

describe("Review gate documentation", () => {
  it("renders the current shared check registry and its limits", () => {
    render(<ReviewGatePage />);
    for (const check of QUALITY_CHECK_METADATA) {
      expect(screen.getByText(check.name)).toBeInTheDocument();
      expect(screen.getByText(check.description)).toBeInTheDocument();
    }
    expect(screen.getByText("publication_readiness")).toBeInTheDocument();
    expect(screen.getByText("problem_teaching_alignment")).toBeInTheDocument();
    expect(screen.queryByText("cross_concept_coverage")).not.toBeInTheDocument();
    expect(screen.getByText(/It does not measure a learner/)).toBeInTheDocument();
  });
});
