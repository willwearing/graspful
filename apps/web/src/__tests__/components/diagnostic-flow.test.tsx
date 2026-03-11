import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
