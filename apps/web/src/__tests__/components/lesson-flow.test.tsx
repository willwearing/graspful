import { describe, it, expect, vi, beforeEach } from "vitest";
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
      orgId="org-1"
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
    mockApiClientFetch.mockResolvedValueOnce({ correct: true, feedback: "Correct!" });

    renderFlow();
    // KP1: instruction -> worked example -> practice
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.click(screen.getByRole("button", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByText("Practice complete")).toBeTruthy();
    }, { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(screen.getByText("Flashover occurs when all surfaces in a room ignite simultaneously.")).toBeTruthy();
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
  });

  it("shows Complete Lesson button on last KP after practice is done", async () => {
    mockApiClientFetch
      .mockResolvedValueOnce({ correct: true, feedback: "Correct!" })
      .mockResolvedValueOnce({ correct: true, feedback: "Correct!" });

    renderFlow();
    // KP1: instruction -> worked example -> practice -> answer -> continue
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByText("Practice complete")).toBeTruthy();
    }, { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    // KP2: instruction -> worked example -> practice -> answer
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /all surfaces igniting in a room/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
    }, { timeout: 2500 });
    expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
  });

  it("calls complete API and redirects on completion", async () => {
    mockApiClientFetch
      .mockResolvedValueOnce({ correct: true, feedback: "Correct!" })
      .mockResolvedValueOnce({ correct: true, feedback: "Correct!" })
      .mockResolvedValueOnce({ conceptId: "c1", status: "lesson_complete" });

    renderFlow();
    // KP1: instruction -> worked example -> practice -> answer -> continue
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: "Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => {
      expect(screen.getByText("Practice complete")).toBeTruthy();
    }, { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    // KP2: instruction -> worked example -> practice -> answer -> complete
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /all surfaces igniting in a room/i }));
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
});
