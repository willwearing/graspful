import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  it("optimistically advances and shows saving state before the answer request resolves", async () => {
    const pending = deferred<{ answeredCount: number; totalProblems: number }>();
    mockApiClientFetch.mockReturnValueOnce(pending.promise);

    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );

    fireEvent.click(screen.getByText("Answer A"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText("Quiz question 2?")).toBeTruthy();
    expect(screen.getByText(/saving answer/i)).toBeTruthy();
    expect(screen.getByText(/2 of 3/)).toBeTruthy();

    await act(async () => {
      pending.resolve({ answeredCount: 1, totalProblems: 3 });
      await pending.promise;
    });

    await waitFor(() => {
      expect(screen.queryByText(/saving answer/i)).toBeNull();
    });
  });

  it("returns to the current question if saving the answer fails", async () => {
    const pending = deferred<{ answeredCount: number; totalProblems: number }>();
    mockApiClientFetch.mockReturnValueOnce(pending.promise);

    render(
      <QuizFlow orgSlug="org-1" courseId="c1" token="test-token" quizData={quizData} />
    );

    fireEvent.click(screen.getByText("Answer A"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText("Quiz question 2?")).toBeTruthy();

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
      expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    });
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
});
