import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewFlow } from "@/components/app/review-flow";

const mockApiClientFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  apiClientFetch: (...args: any[]) => mockApiClientFetch(...args),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const reviewStart = {
  sessionId: "rev-1",
  totalProblems: 5,
  problemNumber: 1,
  currentProblem: {
    id: "p1",
    questionText: "What color is a fire hydrant?",
    type: "multiple_choice",
    options: [
      { id: "a", text: "Red" },
      { id: "b", text: "Blue" },
    ],
    difficulty: 1,
  },
};

describe("ReviewFlow", () => {
  beforeEach(() => {
    mockApiClientFetch.mockReset();
    mockPush.mockReset();
  });

  it("renders the first problem with score tracker", () => {
    render(
      <ReviewFlow
        orgId="org-1"
        courseId="c1"
        conceptId="concept-1"
        token="test-token"
        initialData={reviewStart}
      />
    );
    expect(screen.getByText("What color is a fire hydrant?")).toBeTruthy();
    expect(screen.getByText(/1 of 5/)).toBeTruthy();
    expect(screen.getByText(/0 correct/i)).toBeTruthy();
  });

  it("submits answer and shows next problem", async () => {
    mockApiClientFetch.mockResolvedValueOnce({
      correct: true,
      feedback: "Red is correct!",
      xpAwarded: 10,
      hasMore: true,
      problemNumber: 2,
      totalProblems: 5,
      nextProblem: {
        id: "p2",
        questionText: "Second question?",
        type: "true_false",
        difficulty: 2,
      },
    });

    render(
      <ReviewFlow
        orgId="org-1"
        courseId="c1"
        conceptId="concept-1"
        token="test-token"
        initialData={reviewStart}
      />
    );

    fireEvent.click(screen.getByText("Red"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/correct/i)).toBeTruthy();
    });
  });
});
