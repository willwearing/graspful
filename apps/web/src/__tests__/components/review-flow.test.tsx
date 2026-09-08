import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewFlow } from "@/components/app/review-flow";

const mockApiClientFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
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
    type: "multiple_choice" as const,
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
        orgSlug="org-1"
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
        orgSlug="org-1"
        courseId="c1"
        conceptId="concept-1"
        token="test-token"
        initialData={reviewStart}
      />
    );

    fireEvent.click(screen.getByText("Red"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Red is correct!")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Second question?")).toBeInTheDocument(), { timeout: 2500 });
    expect(screen.getByText("1 correct")).toBeInTheDocument();
  });

  it("keeps the answer and retry control after a failed answer request", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ correct: true, feedback: "Red is correct!", hasMore: true, problemNumber: 2, nextProblem: { id: "p2", questionText: "Second question?", type: "true_false", difficulty: 1 } });
    render(<ReviewFlow orgSlug="org-1" courseId="c1" conceptId="concept-1" token="test-token" initialData={reviewStart} />);
    fireEvent.click(screen.getByRole("radio", { name: "Red" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save your answer/i);
    expect(screen.getByRole("radio", { name: "Red" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeEnabled();
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry answer" }));
    expect(await screen.findByText("Red is correct!")).toBeInTheDocument();
    expect(JSON.parse(mockApiClientFetch.mock.calls[1][2].body)).toMatchObject({ sessionId: "rev-1", problemId: "p1", answer: "a" });
  });

  it("retries completion without fabricating a failed review or resubmitting the answer", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ correct: true, feedback: "Red is correct!", hasMore: false, problemNumber: 1 })
      .mockRejectedValueOnce(new Error("result unavailable"))
      .mockResolvedValueOnce({ conceptId: "concept-1", passed: true, score: 1, correctCount: 1, totalCount: 1, updatedMasteryState: "mastered" });
    render(<ReviewFlow orgSlug="org-1" courseId="c1" conceptId="concept-1" token="test-token" initialData={{ ...reviewStart, totalProblems: 1 }} />);
    fireEvent.click(screen.getByRole("radio", { name: "Red" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not load your review result/i), { timeout: 2500 });
    expect(screen.queryByText("Review Not Passed")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Passed!")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Red" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry completion" }));
    expect(await screen.findByText("Review Passed!")).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 correct \(100%\)/)).toBeInTheDocument();
    expect(mockApiClientFetch.mock.calls.filter(([path]) => path.endsWith("/answer"))).toHaveLength(1);
    expect(mockApiClientFetch.mock.calls.filter(([path]) => path.endsWith("/complete"))).toHaveLength(2);
  });
});
