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
      workedExampleText: "Example: A candle flame needs all three elements.",
    },
    {
      id: "kp2",
      slug: "flashover",
      instructionText: "Flashover occurs when all surfaces in a room ignite simultaneously.",
      workedExampleText: "Example: Room temperature reaches 500-600C.",
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
    expect(screen.getByText(/1 of 2/)).toBeTruthy();
  });

  it("shows worked example after clicking Continue from instruction", () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/candle flame/)).toBeTruthy();
    expect(screen.getByText("Worked Example")).toBeTruthy();
  });

  it("shows practice placeholder after worked example", () => {
    renderFlow();
    // instruction -> worked example
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    // worked example -> practice
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("Practice")).toBeTruthy();
    expect(screen.getByText("Practice problems coming soon")).toBeTruthy();
    expect(screen.getByRole("button", { name: /mark as understood/i })).toBeTruthy();
  });

  it("advances to next KP after marking practice as understood", () => {
    renderFlow();
    // KP1: instruction -> worked example -> practice
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    // Mark as understood -> moves to KP2 instruction
    fireEvent.click(screen.getByRole("button", { name: /mark as understood/i }));
    expect(screen.getByText("Flashover occurs when all surfaces in a room ignite simultaneously.")).toBeTruthy();
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
  });

  it("shows Complete Lesson button on last KP practice phase", () => {
    renderFlow();
    // KP1: instruction -> worked example -> practice -> mark understood
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark as understood/i }));
    // KP2: instruction -> worked example -> practice
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
  });

  it("calls complete API and redirects on completion", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ conceptId: "c1", status: "lesson_complete" });

    renderFlow();
    // KP1: instruction -> worked example -> practice -> mark understood
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark as understood/i }));
    // KP2: instruction -> worked example -> practice -> complete
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
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
