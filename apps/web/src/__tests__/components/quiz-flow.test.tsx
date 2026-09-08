import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QuizFlow } from "@/components/app/quiz-flow";

const mockApiClientFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: any[]) => mockApiClientFetch(...args),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const quizData = {
  quizId: "quiz-1",
  totalProblems: 3,
  timeLimitMs: 900000, // 15 min
  problems: [
    {
      id: "p1",
      questionText: "Quiz question 1?",
      type: "multiple_choice" as const,
      options: [
        { id: "a", text: "Answer A" },
        { id: "b", text: "Answer B" },
      ],
      difficulty: 2,
    },
    {
      id: "p2",
      questionText: "Quiz question 2?",
      type: "true_false" as const,
      difficulty: 1,
    },
    {
      id: "p3",
      questionText: "Quiz question 3?",
      type: "fill_blank" as const,
      difficulty: 3,
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("QuizFlow", () => {
  beforeEach(() => {
    mockApiClientFetch.mockReset();
    mockPush.mockReset();
  });

  it("renders first problem and timer", () => {
    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );
    expect(screen.getByText("Quiz question 1?")).toBeTruthy();
    expect(screen.getByText(/15:00/)).toBeTruthy();
    expect(screen.getByText(/1 of 3/)).toBeTruthy();
  });

  it("moves to next problem after answering (no feedback shown)", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ answeredCount: 1, totalProblems: 3 });

    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );

    fireEvent.click(screen.getByText("Answer A"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText("Quiz question 2?")).toBeTruthy();
    });
  });

  it("keeps the current question and selection until the answer is saved", async () => {
    const pending = deferred<{ answeredCount: number; totalProblems: number }>();
    mockApiClientFetch.mockReturnValueOnce(pending.promise);

    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );

    fireEvent.click(screen.getByText("Answer A"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText("Quiz question 1?")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Answer A" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/saving answer/i)).toBeTruthy();
    expect(screen.getByText(/1 of 3/)).toBeTruthy();

    await act(async () => {
      pending.resolve({ answeredCount: 1, totalProblems: 3 });
      await pending.promise;
    });

    await waitFor(() => {
      expect(screen.queryByText(/saving answer/i)).toBeNull();
      expect(screen.getByText("Quiz question 2?")).toBeTruthy();
    });
  });

  it("keeps the selected answer available for retry if saving fails", async () => {
    const pending = deferred<{ answeredCount: number; totalProblems: number }>();
    mockApiClientFetch.mockReturnValueOnce(pending.promise);

    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );

    fireEvent.click(screen.getByText("Answer A"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText("Quiz question 1?")).toBeTruthy();

    await act(async () => {
      pending.reject(new Error("save failed"));
      try {
        await pending.promise;
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(screen.getByText("Quiz question 1?")).toBeTruthy();
      expect(screen.getByRole("alert")).toHaveTextContent(/could not save your answer/i);
    });
    expect(screen.getByRole("radio", { name: "Answer A" })).toHaveAttribute("aria-checked", "true");
    mockApiClientFetch.mockResolvedValueOnce({ answeredCount: 1, totalProblems: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Retry answer" }));
    await waitFor(() => expect(screen.getByText("Quiz question 2?")).toBeInTheDocument());
    expect(JSON.parse(mockApiClientFetch.mock.calls[1][2].body)).toMatchObject({ problemId: "p1", answer: "a" });
  });

  it("shows question 3 of 3 after answering first two", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ answeredCount: 1, totalProblems: 3 });
    mockApiClientFetch.mockResolvedValueOnce({ answeredCount: 2, totalProblems: 3 });

    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );

    // Answer Q1
    fireEvent.click(screen.getByText("Answer A"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(screen.getByText("Quiz question 2?")).toBeTruthy());

    // Answer Q2
    fireEvent.click(screen.getByRole("button", { name: /true/i }));
    await waitFor(() => expect(screen.getByText("Quiz question 3?")).toBeTruthy());

    // On last question
    expect(screen.getByText(/3 of 3/)).toBeTruthy();
  });

  it("retries completion without inventing a score or submitting the final answer twice", async () => {
    mockApiClientFetch
      .mockResolvedValueOnce({ answeredCount: 1, totalProblems: 1 })
      .mockRejectedValueOnce(new Error("result unavailable"))
      .mockResolvedValueOnce({ quizId: "quiz-1", score: 1, correctCount: 1, totalCount: 1, xpAwarded: 0, failedConcepts: [], conceptBreakdown: [], results: [] });
    render(<QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={{ ...quizData, totalProblems: 1, problems: [quizData.problems[0]] }} />);
    fireEvent.click(screen.getByRole("radio", { name: "Answer A" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Finish Quiz" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your quiz result/i);
    expect(screen.queryByText("Quiz Complete")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry completion" }));
    expect(await screen.findByText("Quiz Complete")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(mockApiClientFetch.mock.calls.filter(([path]) => path.endsWith("/answer"))).toHaveLength(1);
    expect(mockApiClientFetch.mock.calls.filter(([path]) => path.endsWith("/complete"))).toHaveLength(2);
  });

  it("waits for the pending answer before completing on timeout", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<{ answeredCount: number; totalProblems: number }>();
      mockApiClientFetch.mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce({ quizId: "quiz-1", score: 1, correctCount: 1, totalCount: 1, xpAwarded: 0, failedConcepts: [], conceptBreakdown: [], results: [] });
      render(<QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={{ ...quizData, totalProblems: 1, timeLimitMs: 1000, problems: [quizData.problems[0]] }} />);
      fireEvent.click(screen.getByRole("radio", { name: "Answer A" }));
      fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
      await act(async () => { pending.resolve({ answeredCount: 1, totalProblems: 1 }); });
      expect(mockApiClientFetch.mock.calls[1][0]).toMatch(/\/complete$/);
      expect(screen.getByText("100%")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("checks an expired server deadline immediately and keeps a failed result request retryable", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-08T12:15:00Z"));
      mockApiClientFetch.mockRejectedValueOnce(new Error("offline"));
      render(<QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={{ ...quizData, expiresAt: Date.parse("2026-09-08T12:12:00Z") }} />);
      await act(async () => {});
      expect(screen.getByRole("button", { name: "Retry completion" })).toBeEnabled();
      expect(screen.getByText("0:00")).toBeInTheDocument();
      expect(screen.queryByText("Quiz Complete")).not.toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the server deadline when the browser timer runs late", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
      mockApiClientFetch.mockResolvedValueOnce({ quizId: "quiz-1", score: 0, correctCount: 0, totalCount: 3, xpAwarded: 0, failedConcepts: [], conceptBreakdown: [], results: [] });
      render(<QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={{ ...quizData, expiresAt: Date.parse("2026-09-08T12:12:00Z") }} />);
      expect(screen.getByText("12:00")).toBeInTheDocument();
      vi.setSystemTime(new Date("2026-09-08T12:15:00Z"));
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(mockApiClientFetch.mock.calls[0][0]).toMatch(/\/complete$/);
      expect(screen.getByText("Quiz Complete")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
