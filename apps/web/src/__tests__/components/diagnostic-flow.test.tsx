import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { DiagnosticFlow } from "@/components/app/diagnostic-flow";

const mockApiClientFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: unknown[]) => mockApiClientFetch(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const startData = {
  sessionId: "sess-1",
  questionNumber: 1,
  totalEstimated: 10,
  isComplete: false,
  question: {
    id: "q1",
    questionText: "What is NFPA?",
    type: "multiple_choice" as const,
    options: [
      { id: "a", text: "National Fire Protection Association" },
      { id: "b", text: "Not For Public Access" },
    ],
    difficulty: 2,
  },
};

describe("DiagnosticFlow", () => {
  beforeEach(() => {
    mockApiClientFetch.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("renders the first question from initial data", () => {
    render(
      <DiagnosticFlow
        orgSlug="org-1"
        courseId="course-1"
        token="test-token"
        initialData={startData}
      />
    );
    expect(screen.getByText("What is NFPA?")).toBeTruthy();
    expect(screen.getByText("Question 1 of ~10")).toBeTruthy();
    expect(
      screen.getByText(
        "This diagnostic is adaptive, so questions may jump between topics and sections."
      )
    ).toBeTruthy();
  });

  it("submits an answer and shows feedback", async () => {
    mockApiClientFetch.mockResolvedValueOnce({
      sessionId: "sess-1",
      questionNumber: 2,
      isComplete: false,
      wasCorrect: true,
      question: {
        id: "q2",
        questionText: "Second question?",
        type: "true_false",
        difficulty: 2,
      },
    });

    render(
      <DiagnosticFlow
        orgSlug="org-1"
        courseId="course-1"
        token="test-token"
        initialData={startData}
      />
    );

    fireEvent.click(screen.getByText("National Fire Protection Association"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/correct/i)).toBeTruthy();
    });
  });

  it("resets selected state when advancing to next question", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockApiClientFetch.mockResolvedValueOnce({
      sessionId: "sess-1",
      questionNumber: 2,
      isComplete: false,
      wasCorrect: true,
      question: {
        id: "q2",
        questionText: "What does NEC stand for?",
        type: "multiple_choice" as const,
        options: [
          { id: "c", text: "National Electrical Code" },
          { id: "d", text: "New Energy Commission" },
        ],
        difficulty: 2,
      },
    });

    render(
      <DiagnosticFlow
        orgSlug="org-1"
        courseId="course-1"
        token="test-token"
        initialData={startData}
      />
    );

    // Select and submit answer for Q1
    fireEvent.click(screen.getByText("National Fire Protection Association"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    // Wait for feedback to appear
    await waitFor(() => {
      expect(screen.getByText(/correct/i)).toBeTruthy();
    });

    // Advance past the 1500ms feedback delay to load next question
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // Q2 should now be rendered
    await waitFor(() => {
      expect(screen.getByText("What does NEC stand for?")).toBeTruthy();
    });

    // Neither option on Q2 should have the selected style (border-primary bg-primary/5)
    const optionC = screen.getByText("National Electrical Code").closest("button")!;
    const optionD = screen.getByText("New Energy Commission").closest("button")!;
    expect(optionC.className).not.toContain("bg-primary/5");
    expect(optionD.className).not.toContain("bg-primary/5");

    // Submit button should be disabled since nothing is selected
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();

    vi.useRealTimers();
  });

  it("shows completion screen when diagnostic is complete", async () => {
    const completeData = {
      ...startData,
      isComplete: true,
      question: null,
    };

    mockApiClientFetch.mockResolvedValueOnce({
      totalConcepts: 10,
      questionsAnswered: 8,
      breakdown: { mastered: 5, conditionally_mastered: 2, partially_known: 2, unknown: 1 },
      conceptDetails: [],
    });

    render(
      <DiagnosticFlow
        orgSlug="org-1"
        courseId="course-1"
        token="test-token"
        initialData={completeData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/diagnostic complete/i)).toBeTruthy();
    });
  });
  it("loads the final result once after showing answer feedback", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiClientFetch.mockResolvedValueOnce({
      sessionId: "sess-1", questionNumber: 1, isComplete: true, wasCorrect: true, question: null,
    }).mockResolvedValueOnce({
      totalConcepts: 1, questionsAnswered: 1,
      breakdown: { mastered: 1, conditionally_mastered: 0, partially_known: 0, unknown: 0 }, conceptDetails: [],
    });
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByText("National Fire Protection Association"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(screen.getByText("Loading next question...")).toBeInTheDocument());
    await act(() => vi.advanceTimersByTimeAsync(1500));
    await waitFor(() => expect(screen.getByText("You answered 1 questions across 1 concepts.")).toBeInTheDocument());
    expect(mockApiClientFetch.mock.calls.map(([path]) => path)).toEqual([
      "/orgs/org-1/courses/course-1/diagnostic/answer",
      "/orgs/org-1/courses/course-1/diagnostic/result/sess-1",
    ]);
  });

  it("lets the learner retry a failed result load without submitting the answer again", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      totalConcepts: 1, questionsAnswered: 1,
      breakdown: { mastered: 1, conditionally_mastered: 0, partially_known: 0, unknown: 0 }, conceptDetails: [],
    });
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token"
      initialData={{ ...startData, isComplete: true, question: null }} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your diagnostic result");
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry result" }));
    expect(await screen.findByText("You answered 1 questions across 1 concepts.")).toBeInTheDocument();
    expect(mockApiClientFetch).toHaveBeenCalledTimes(2);
    expect(mockApiClientFetch.mock.calls.every(([path]) => path.endsWith("/result/sess-1"))).toBe(true);
  });

  it("cancels delayed completion when the learner leaves the diagnostic", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiClientFetch.mockResolvedValueOnce({
      sessionId: "sess-1", questionNumber: 1, isComplete: true, wasCorrect: false, question: null,
    });
    const { unmount } = render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    await waitFor(() => expect(screen.getByText("Loading next question...")).toBeInTheDocument());
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
  });

});
