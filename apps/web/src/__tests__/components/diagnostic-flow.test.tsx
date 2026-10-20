import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { DiagnosticFlow } from "@/components/app/diagnostic-flow";
import { ApiError } from "@/lib/api-client";

const mockApiClientFetch = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  apiClientFetch: (...args: unknown[]) => mockApiClientFetch(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const startData = {
  sessionId: "sess-1",
  supportsQuestionIdentity: true,
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
    push.mockReset();
    refresh.mockReset();
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

  it.each([
    [undefined, "/learn/org-1/courses/basics", "Go to Course"],
    ["academy-1", "/learn/org-1/academies/basics", "Go to Academy"],
  ])("uses the recorded final result and refreshes the completion route for %s", async (academyId, completionHref, completionLabel) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiClientFetch.mockResolvedValueOnce({
      sessionId: "sess-1", isComplete: true, questionsAnswered: 1,
      result: {
        totalConcepts: 1, questionsAnswered: 1,
        breakdown: { mastered: 0, conditionally_mastered: 0, partially_known: 0, unknown: 1 }, conceptDetails: [],
      },
    });
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" academyId={academyId} token="test-token"
      initialData={startData} completionHref={completionHref} completionLabel={completionLabel} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    await waitFor(() => expect(screen.getByText("Loading next question...")).toBeInTheDocument());
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(await screen.findByText("You answered 1 questions across 1 concepts.")).toBeInTheDocument();
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    expect(mockApiClientFetch.mock.calls[0][0]).toBe(academyId
      ? "/orgs/org-1/academies/academy-1/diagnostic/answer"
      : "/orgs/org-1/courses/course-1/diagnostic/answer");
    fireEvent.click(screen.getByRole("button", { name: completionLabel }));
    expect(push).toHaveBeenCalledWith(completionHref);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the course return available if the completed result cannot load", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline"));
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token"
      initialData={{ ...startData, isComplete: true, question: null }}
      completionHref="/learn/org-1/courses/basics" completionLabel="Go to Course" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your diagnostic result");
    fireEvent.click(screen.getByRole("button", { name: "Go to Course" }));
    expect(push).toHaveBeenCalledWith("/learn/org-1/courses/basics");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("lets the learner submit again after an answer request fails", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      sessionId: "sess-1", questionNumber: 2, totalEstimated: 3, isComplete: false, wasCorrect: false,
      question: { id: "q2", questionText: "Second question?", type: "true_false", difficulty: 2 },
    });
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("What is NFPA?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    await waitFor(() => expect(screen.getByText("Loading next question...")).toBeInTheDocument());
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(await screen.findByText("Second question?")).toBeInTheDocument();
    expect(screen.getByText("Question 2 of ~3")).toBeInTheDocument();
    expect(mockApiClientFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mockApiClientFetch.mock.calls[0][2].body)).toMatchObject({
      sessionId: "sess-1", expectedProblemId: "q1", questionNumber: 1, answer: "__I_DONT_KNOW__",
    });
    expect(JSON.parse(mockApiClientFetch.mock.calls[1][2].body)).toMatchObject({ expectedProblemId: "q1", questionNumber: 1 });
  });

  it.each([undefined, "academy-1"])("resumes a changed question after a committed answer response was lost for %s", async (academyId) => {
    mockApiClientFetch.mockRejectedValueOnce(new ApiError(409, "Diagnostic question changed. Reload the current question."))
      .mockResolvedValueOnce({ ...startData, questionNumber: 2,
        question: { ...startData.question, id: "q2", questionText: "The current question" } })
      .mockResolvedValueOnce({ ...startData, questionNumber: 3, wasCorrect: false,
        question: { ...startData.question, id: "q3", questionText: "Third question" } });
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" academyId={academyId} token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    expect(await screen.findByText("The current question")).toBeInTheDocument();
    expect(screen.getByText("Question 2 of ~10")).toBeInTheDocument();
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading next question...")).not.toBeInTheDocument();
    const scope = academyId ? "academies/academy-1" : "courses/course-1";
    expect(mockApiClientFetch.mock.calls.map(([path]) => path)).toEqual([
      `/orgs/org-1/${scope}/diagnostic/answer`, `/orgs/org-1/${scope}/diagnostic/start`,
    ]);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    await waitFor(() => expect(mockApiClientFetch).toHaveBeenCalledTimes(3));
    expect(JSON.parse(mockApiClientFetch.mock.calls[2][2].body)).toMatchObject({ expectedProblemId: "q2", questionNumber: 2 });
  });

  it("loads completed results if the changed question recovery finds the final answer was committed", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new ApiError(409, "Diagnostic question changed. Reload the current question."))
      .mockRejectedValueOnce(new ApiError(400, "Diagnostic already completed"))
      .mockResolvedValueOnce({ totalConcepts: 1, questionsAnswered: 1,
        breakdown: { mastered: 0, conditionally_mastered: 0, partially_known: 0, unknown: 1 }, conceptDetails: [] });
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    expect(await screen.findByText("You answered 1 questions across 1 concepts.")).toBeInTheDocument();
    expect(mockApiClientFetch).toHaveBeenCalledTimes(3);
    expect(mockApiClientFetch.mock.calls[2][0]).toBe("/orgs/org-1/courses/course-1/diagnostic/result/sess-1");
  });

  it.each([new ApiError(409, "Other conflict"), new Error("Diagnostic question changed. Reload the current question.")])("keeps unrelated answer errors available for retry: %s", async (cause) => {
    mockApiClientFetch.mockRejectedValueOnce(cause);
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText("What is NFPA?")).toBeInTheDocument();
  });

  it("lets the learner retry if loading the changed question fails", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new ApiError(409, "Diagnostic question changed. Reload the current question."))
      .mockRejectedValueOnce(new Error("offline"));
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token" initialData={startData} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I don't know this yet" })).toBeEnabled();
    expect(screen.getByText("What is NFPA?")).toBeInTheDocument();
  });

  it("omits new answer identity fields when the backend has not advertised support", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline"));
    render(<DiagnosticFlow orgSlug="org-1" courseId="course-1" token="test-token"
      initialData={{ ...startData, supportsQuestionIdentity: undefined }} />);
    fireEvent.click(screen.getByRole("button", { name: "I don't know this yet" }));
    await waitFor(() => expect(mockApiClientFetch).toHaveBeenCalledOnce());
    expect(JSON.parse(mockApiClientFetch.mock.calls[0][2].body)).toEqual({
      sessionId: "sess-1", answer: "__I_DONT_KNOW__", responseTimeMs: expect.any(Number),
    });
  });

});
