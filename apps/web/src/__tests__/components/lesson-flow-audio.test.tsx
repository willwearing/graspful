import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LessonFlow } from "@/components/app/lesson-flow";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  apiClientFetch: vi.fn(),
}));

const mockLoadQueue = vi.fn();
const mockPlayerContext = {
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  error: null,
  currentItem: null as { id: string; title: string; audioUrl: string } | null,
  queue: [],
  queueIndex: 0,
  loadQueue: mockLoadQueue,
  play: vi.fn(),
  pause: vi.fn(),
  togglePlayPause: vi.fn(),
  seek: vi.fn(),
  setSpeed: vi.fn(),
  cycleSpeed: vi.fn(),
  skipToNext: vi.fn(),
  skipToPrevious: vi.fn(),
  clear: vi.fn(),
};

vi.mock("@/lib/hooks/use-audio-player", () => ({
  useAudioPlayer: () => mockPlayerContext,
}));

// Mock useLessonAudio to return audio URLs
const mockAudioUrls = new Map<string, { instructionUrl?: string; instructionDuration?: number }>();

vi.mock("@/lib/hooks/use-lesson-audio", () => ({
  useLessonAudio: () => ({
    audioUrls: mockAudioUrls,
    loading: false,
  }),
}));

const defaultLesson = {
  conceptId: "concept-1",
  conceptName: "Test Concept",
  knowledgePoints: [
    {
      id: "kp-1",
      slug: "kp-one",
      instructionText: "Learn this first thing.",
      instructionContent: [],
      workedExampleText: "Here is an example.",
      workedExampleContent: [],
      problems: [],
    },
    {
      id: "kp-2",
      slug: "kp-two",
      instructionText: "Learn this second thing.",
      instructionContent: [],
      workedExampleText: "",
      workedExampleContent: [],
      problems: [],
    },
  ],
};

describe("LessonFlow audio integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioUrls.clear();
    mockPlayerContext.isPlaying = false;
    mockPlayerContext.currentItem = null;
  });

  it("renders 'Audio not available' when no audio URL exists", () => {
    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={defaultLesson}
      />,
    );

    expect(screen.getByText("Audio not available")).toBeInTheDocument();
  });

  it("renders 'Listen to instruction' button when audio URL exists", () => {
    mockAudioUrls.set("kp-1", {
      instructionUrl: "https://example.com/audio/kp-1.flac",
      instructionDuration: 30,
    });

    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={defaultLesson}
      />,
    );

    expect(screen.getByText("Listen to instruction")).toBeInTheDocument();
  });

  it("calls loadQueue when play button is clicked", () => {
    mockAudioUrls.set("kp-1", {
      instructionUrl: "https://example.com/audio/kp-1.flac",
      instructionDuration: 30,
    });

    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={defaultLesson}
      />,
    );

    fireEvent.click(screen.getByText("Listen to instruction"));

    expect(mockLoadQueue).toHaveBeenCalledWith([
      {
        id: "kp-1",
        title: "Test Concept - kp-one",
        audioUrl: "https://example.com/audio/kp-1.flac",
        durationSeconds: 30,
      },
    ]);
  });

  it("shows 'Playing...' when current item is playing", () => {
    mockAudioUrls.set("kp-1", {
      instructionUrl: "https://example.com/audio/kp-1.flac",
    });
    mockPlayerContext.isPlaying = true;
    mockPlayerContext.currentItem = {
      id: "kp-1",
      title: "Test",
      audioUrl: "https://example.com/audio/kp-1.flac",
    };

    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={defaultLesson}
      />,
    );

    expect(screen.getByText("Playing...")).toBeInTheDocument();
  });
});
