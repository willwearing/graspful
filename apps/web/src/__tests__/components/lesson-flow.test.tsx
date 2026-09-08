import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LessonFlow } from "@/components/app/lesson-flow";

const mockApiClientFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: any[]) => mockApiClientFetch(...args),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/hooks/use-audio-player", () => ({
  useAudioPlayer: () => ({
    isPlaying: false,
    currentItem: null,
    loadQueue: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-lesson-audio", () => ({
  useLessonAudio: () => ({
    audioUrls: new Map(),
    loading: false,
  }),
}));

const lessonData = {
  conceptId: "c1",
  conceptName: "Fire Behavior",
  knowledgePoints: [
    {
      id: "kp1",
      slug: "fire-triangle",
      instructionText: "Fire requires heat, fuel, and oxygen.",
      instructionContent: [
        {
          type: "callout" as const,
          title: "Mental model",
          body: "Think of each fire requirement as a component in a system.",
        },
      ],
      workedExampleText: "Example: A candle flame needs all three elements.",
      workedExampleContent: [],
      problems: [
        {
          id: "p1",
          questionText: "Which element is part of the fire triangle?",
          type: "multiple_choice" as const,
          options: [
            { id: "0", text: "Heat" },
            { id: "1", text: "Gravity" },
            { id: "2", text: "Wood only" },
            { id: "3", text: "Rust" },
          ],
          difficulty: 2,
        },
      ],
    },
    {
      id: "kp2",
      slug: "flashover",
      instructionText: "Flashover occurs when all surfaces in a room ignite simultaneously.",
      instructionContent: [],
      workedExampleText: "Example: Room temperature reaches 500-600C.",
      workedExampleContent: [],
      problems: [
        {
          id: "p2",
          questionText: "Flashover is best described as:",
          type: "multiple_choice" as const,
          options: [
            { id: "0", text: "A single spark" },
            { id: "1", text: "All surfaces igniting in a room" },
            { id: "2", text: "A cold smoke event" },
            { id: "3", text: "A water supply failure" },
          ],
          difficulty: 3,
        },
      ],
    },
  ],
};

function renderFlow() {
  return render(
    <LessonFlow
      orgSlug="org-1"
      courseId="course-1"
      token="test-token"
      lesson={lessonData}
    />
  );
}

describe("LessonFlow", () => {
  beforeEach(() => {
    mockApiClientFetch.mockReset();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the first knowledge point instruction", () => {
    renderFlow();
    expect(screen.getByText("Fire Behavior")).toBeTruthy();
    expect(screen.getByText("Fire requires heat, fuel, and oxygen.")).toBeTruthy();
    expect(screen.getByText("Mental model")).toBeTruthy();
    expect(screen.getByText(/1 of 2/)).toBeTruthy();
  });

  it("shows worked example after clicking Continue from instruction", () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/candle flame/)).toBeTruthy();
    expect(screen.getByText("Worked Example")).toBeTruthy();
  });

  it("shows the first practice problem after worked example", () => {
    renderFlow();
    // instruction -> worked example
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    // worked example -> practice
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("Practice")).toBeTruthy();
    expect(screen.getByText("Which element is part of the fire triangle?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeTruthy();
  });

  it("advances to next KP after completing practice", async () => {
    // The backend returns a nextProblemHint telling the frontend to advance
    // to kp2 after the learner passes kp1 (stream-driven practice loop).
    mockApiClientFetch.mockResolvedValueOnce({
      correct: true,
      feedback: "Correct!",
      nextProblemHint: {
        targetKPId: "kp2",
        nextProblemId: "p2",
        reopenWorkedExample: false,
        retryDelayMs: 0,
        lessonComplete: false,
      },
    });

    renderFlow();
    // KP1: instruction -> worked example -> practice
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.click(screen.getByRole("radio", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    // The hint advances directly to kp2's practice — no "Practice complete"
    // intermediate for the old KP since the stream keeps flowing.
    await waitFor(() => {
      expect(screen.getByText("Flashover is best described as:")).toBeTruthy();
    }, { timeout: 2500 });
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
  });

  it("shows Complete Lesson button on last KP after practice is done", async () => {
    mockApiClientFetch
      .mockResolvedValueOnce({
        correct: true,
        feedback: "Correct!",
        nextProblemHint: {
          targetKPId: "kp2",
          nextProblemId: "p2",
          reopenWorkedExample: false,
          retryDelayMs: 0,
          lessonComplete: false,
        },
      })
      .mockResolvedValueOnce({
        correct: true,
        feedback: "Correct!",
        nextProblemHint: {
          targetKPId: "kp2",
          nextProblemId: null,
          reopenWorkedExample: false,
          retryDelayMs: 0,
          lessonComplete: true,
        },
      });

    renderFlow();
    // KP1: instruction -> worked example -> practice -> answer (advances to kp2)
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByText("Flashover is best described as:")).toBeTruthy();
    }, { timeout: 2500 });

    // KP2: already in practice (stream-driven) -> answer -> lessonComplete
    fireEvent.click(screen.getByRole("radio", { name: /all surfaces igniting in a room/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
    }, { timeout: 2500 });
    expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
  });

  it("calls complete API and redirects on completion", async () => {
    mockApiClientFetch
      .mockResolvedValueOnce({
        correct: true,
        feedback: "Correct!",
        nextProblemHint: {
          targetKPId: "kp2",
          nextProblemId: "p2",
          reopenWorkedExample: false,
          retryDelayMs: 0,
          lessonComplete: false,
        },
      })
      .mockResolvedValueOnce({
        correct: true,
        feedback: "Correct!",
        nextProblemHint: {
          targetKPId: "kp2",
          nextProblemId: null,
          reopenWorkedExample: false,
          retryDelayMs: 0,
          lessonComplete: true,
        },
      })
      .mockResolvedValueOnce({ conceptId: "c1", status: "lesson_complete" });

    renderFlow();
    // KP1: instruction -> worked example -> practice -> answer (advances to kp2)
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByText("Flashover is best described as:")).toBeTruthy();
    }, { timeout: 2500 });

    // KP2: already in practice -> answer -> lessonComplete -> complete
    fireEvent.click(screen.getByRole("radio", { name: /all surfaces igniting in a room/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
    }, { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: /complete lesson/i }));

    await waitFor(() => {
      expect(mockApiClientFetch).toHaveBeenCalledWith(
        "/orgs/org-1/courses/course-1/lessons/c1/complete",
        "test-token",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("navigates back through phases with Previous button", () => {
    renderFlow();
    // No Previous on first instruction
    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();

    // instruction -> worked example
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("button", { name: /previous/i })).toBeTruthy();

    // Previous goes back to instruction
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText("Fire requires heat, fuel, and oxygen.")).toBeTruthy();
    expect(screen.getByText("Instruction")).toBeTruthy();
  });

  it("retries an exact saved request after a lost response and freezes the original answer", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(5000);
    mockApiClientFetch.mockRejectedValueOnce(new Error("response lost after server saved answer"))
      .mockResolvedValueOnce({ correct: true, feedback: "Heat is correct", nextProblemHint: { targetKPId: "kp2", nextProblemId: "p2", reopenWorkedExample: false, retryDelayMs: 0, lessonComplete: false } });
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not confirm your answer was saved/i);
    expect(screen.getByRole("radio", { name: "Heat" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Heat" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Gravity" }));
    expect(screen.getByRole("radio", { name: "Heat" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
    const originalBody = mockApiClientFetch.mock.calls[0][2].body;
    const originalRequest = JSON.parse(originalBody);
    expect(originalRequest).toEqual({
      requestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
      problemId: "p1",
      answer: "0",
      responseTimeMs: 1,
      seenProblemIds: ["p1"],
      workedExampleReopenedKPIds: [],
    });
    now.mockReturnValue(35000);
    fireEvent.click(screen.getByRole("button", { name: "Retry answer" }));
    expect(await screen.findByText("Heat is correct")).toBeInTheDocument();
    expect(mockApiClientFetch.mock.calls[1][2].body).toBe(originalBody);
    expect(mockApiClientFetch).toHaveBeenCalledTimes(2);
  });

  it("uses a new request ID and current hints for a new attempt at the same problem", async () => {
    mockApiClientFetch.mockResolvedValueOnce({
      correct: false,
      feedback: "Review the example and try again.",
      nextProblemHint: { targetKPId: "kp1", nextProblemId: "p1", reopenWorkedExample: true, retryDelayMs: 0, lessonComplete: false },
    }).mockResolvedValueOnce({
      correct: false,
      feedback: "Review the example and try again.",
      nextProblemHint: { targetKPId: "kp1", nextProblemId: "p1", reopenWorkedExample: false, retryDelayMs: 0, lessonComplete: false },
    });
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: "Gravity" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(await screen.findByText("Review the example and try again.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("radio", { name: "Gravity" })).toBeEnabled(), { timeout: 2500 });
    expect(screen.getByRole("radio", { name: "Gravity" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("radio", { name: "Gravity" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    await waitFor(() => expect(mockApiClientFetch).toHaveBeenCalledTimes(2));
    const first = JSON.parse(mockApiClientFetch.mock.calls[0][2].body);
    const second = JSON.parse(mockApiClientFetch.mock.calls[1][2].body);
    expect(second.requestId).not.toBe(first.requestId);
    expect(second).toMatchObject({
      problemId: first.problemId,
      answer: first.answer,
      seenProblemIds: ["p1"],
      workedExampleReopenedKPIds: ["kp1"],
    });
    expect(second.responseTimeMs).toBeGreaterThan(0);
  });

  it("shows and retries a lesson completion failure without leaving the lesson", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ correct: true, feedback: "Heat is correct", nextProblemHint: { targetKPId: "kp1", nextProblemId: null, reopenWorkedExample: false, retryDelayMs: 0, lessonComplete: true } })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ conceptId: "c1", status: "lesson_complete" });
    render(<LessonFlow orgSlug="org-1" courseId="course-1" token="test-token" lesson={{ ...lessonData, knowledgePoints: [lessonData.knowledgePoints[0]] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Complete Lesson" })).toBeInTheDocument(), { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: "Complete Lesson" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save lesson completion/i);
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry completion" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/study/course-1"));
    expect(mockApiClientFetch.mock.calls.filter(([path]) => path.endsWith("/answer"))).toHaveLength(1);
    expect(mockApiClientFetch.mock.calls.filter(([path]) => path.endsWith("/complete"))).toHaveLength(2);
  });
});
