import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SectionExamFlow, type SectionExamData } from "@/components/app/section-exam-flow";

const mockApiClientFetch = vi.fn();
const mockCompleted = vi.fn();
vi.mock("@/lib/api-client", () => ({ apiClientFetch: (...args: unknown[]) => mockApiClientFetch(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/posthog/events", () => ({
  trackSectionExamStarted: vi.fn(), trackSectionExamQuestionAnswered: vi.fn(),
  trackSectionExamCompleted: (...args: unknown[]) => mockCompleted(...args),
}));
const examData: SectionExamData = {
  sessionId: "exam-1", totalProblems: 3, timeLimitMs: 720000,
  instructions: "Answer each question.", passingScore: 0.75,
  problems: ["p1", "p2", "p3"].map((id, index) => ({
    id, questionText: `Exam question ${index + 1}?`, type: "multiple_choice" as const,
    options: [{ id: "a", text: "Answer A" }, { id: "b", text: "Answer B" }], difficulty: 2,
  })),
};
const result = {
  sessionId: "exam-1", sectionId: "section-1", passed: true, score: 1,
  correctCount: 3, totalCount: 3, xpAwarded: 15, failedConcepts: [], conceptBreakdown: [],
};
function renderExam(data: SectionExamData = examData) {
  return render(<SectionExamFlow orgSlug="org-1" courseId="course-1" sectionId="section-1" token="token" examData={data} />);
}
function submitAnswer() {
  fireEvent.click(screen.getByRole("radio", { name: "Answer A" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("SectionExamFlow", () => {
  beforeEach(() => { mockApiClientFetch.mockReset(); mockCompleted.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("resumes the first unanswered problem with the server's remaining time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:10:00Z"));
    renderExam({ ...examData, answeredProblemIds: ["p1", "p3"], startedAt: "2026-09-08T12:00:00Z", expiresAt: "2026-09-08T12:12:00Z" });
    expect(screen.getByText("Exam question 2?")).toBeInTheDocument();
    expect(screen.getByText("2:00")).toBeInTheDocument();
    expect(Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"))).toBeCloseTo(200 / 3);
  });

  it("keeps the current answer visible until it is saved", async () => {
    const pending = deferred<{ answeredCount: number; totalProblems: number }>();
    mockApiClientFetch.mockReturnValueOnce(pending.promise);
    renderExam(); submitAnswer();
    expect(screen.getByText("Exam question 1?")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Answer A" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Saving answer...")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await act(async () => pending.resolve({ answeredCount: 1, totalProblems: 3 }));
    expect(screen.getByText("Exam question 2?")).toBeInTheDocument();
  });

  it("preserves a failed answer for retry without choosing it again", async () => {
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline"));
    mockApiClientFetch.mockResolvedValueOnce({ answeredCount: 1, totalProblems: 3 });
    renderExam(); submitAnswer();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your selection is kept"));
    expect(screen.getByRole("radio", { name: "Answer A" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    await waitFor(() => expect(screen.getByText("Exam question 2?")).toBeInTheDocument());
    expect(mockApiClientFetch).toHaveBeenCalledTimes(2);
    for (const call of mockApiClientFetch.mock.calls) {
      expect(JSON.parse(call[2].body)).toMatchObject({ problemId: "p1", answer: "a" });
    }
  });

  it("does not offer a saved question again when the final answer succeeds", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ answeredCount: 3, totalProblems: 3 });
    renderExam({ ...examData, answeredProblemIds: ["p1", "p2"] }); submitAnswer();
    await waitFor(() => expect(screen.getByText("3 of 3 answers saved")).toBeInTheDocument());
    expect(screen.queryByText("Exam question 3?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish section exam" })).toBeEnabled();
  });

  it("shows confirmed results and allows completion retry after failure", async () => {
    const pending = deferred<typeof result>();
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline"));
    mockApiClientFetch.mockReturnValueOnce(pending.promise);
    renderExam({ ...examData, answeredProblemIds: ["p1", "p2", "p3"] });
    fireEvent.click(screen.getByRole("button", { name: "Finish section exam" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry completion" })).toBeEnabled());
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(mockCompleted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry completion" }));
    expect(screen.getByRole("button", { name: "Completing section exam..." })).toBeDisabled();
    await act(async () => pending.resolve(result));
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(mockCompleted).toHaveBeenCalledOnce();
  });

  it("waits for an in-flight answer before completing an expired exam", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
    const pending = deferred<{ answeredCount: number; totalProblems: number }>();
    mockApiClientFetch.mockReturnValueOnce(pending.promise);
    mockApiClientFetch.mockResolvedValueOnce({ ...result, passed: false, score: 1 / 3, correctCount: 1 });
    renderExam({ ...examData, expiresAt: "2026-09-08T12:00:01Z" }); submitAnswer();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Time is up/)).toBeInTheDocument();
    await act(async () => pending.resolve({ answeredCount: 1, totalProblems: 3 }));
    expect(mockApiClientFetch).toHaveBeenCalledTimes(2);
    expect(mockApiClientFetch.mock.calls[1][0]).toMatch(/\/complete$/);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("completes an expired resumed attempt and keeps retry available without looping", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-08T12:15:00Z"));
    mockApiClientFetch.mockRejectedValueOnce(new Error("offline"));
    renderExam({ ...examData, expiresAt: "2026-09-08T12:12:00Z" });
    await act(async () => {});
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.queryByText("Exam question 1?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry completion" })).toBeEnabled();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
  });

  it("uses an absolute deadline after the browser clock advances", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
    mockApiClientFetch.mockResolvedValueOnce(result);
    renderExam({ ...examData, expiresAt: "2026-09-08T12:12:00Z" });
    vi.setSystemTime(new Date("2026-09-08T12:15:00Z"));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(mockApiClientFetch.mock.calls[0][0]).toMatch(/\/complete$/);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
