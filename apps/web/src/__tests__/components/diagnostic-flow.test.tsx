import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { DiagnosticFlow } from "@/components/app/diagnostic-flow";

const mockApiClientFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: any[]) => mockApiClientFetch(...args),
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

  it("renders the first question from initial data", () => {
    render(
      <DiagnosticFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        initialData={startData}
      />
    );
    expect(screen.getByText("What is NFPA?")).toBeTruthy();
    expect(screen.getByText("Question 1 of ~10")).toBeTruthy();
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
        orgId="org-1"
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
        orgId="org-1"
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
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        initialData={completeData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/diagnostic complete/i)).toBeTruthy();
    });
  });
});
