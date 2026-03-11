import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerBar } from "@/components/app/player-bar";

// Mock the audio player hook
const mockContext = {
  isPlaying: false,
  isLoading: false,
  currentTime: 30,
  duration: 120,
  playbackRate: 1,
  error: null,
  currentItem: { id: "item-1", title: "Test Track", audioUrl: "https://example.com/1.flac" },
  queue: [{ id: "item-1", title: "Test Track", audioUrl: "https://example.com/1.flac" }],
  queueIndex: 0,
  loadQueue: vi.fn(),
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
  useAudioPlayer: () => mockContext,
}));

describe("PlayerBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when queue has items", () => {
    render(<PlayerBar />);
    expect(screen.getByRole("region", { name: "Audio player" })).toBeInTheDocument();
  });

  it("is hidden when queue is empty", () => {
    mockContext.queue = [];
    render(<PlayerBar />);
    expect(screen.queryByRole("region", { name: "Audio player" })).not.toBeInTheDocument();
    // Reset
    mockContext.queue = [{ id: "item-1", title: "Test Track", audioUrl: "https://example.com/1.flac" }];
  });

  it("shows play button when not playing", () => {
    mockContext.isPlaying = false;
    render(<PlayerBar />);
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  it("shows pause button when playing", () => {
    mockContext.isPlaying = true;
    render(<PlayerBar />);
    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
    mockContext.isPlaying = false;
  });

  it("displays current time and duration", () => {
    render(<PlayerBar />);
    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  it("displays playback speed", () => {
    render(<PlayerBar />);
    expect(screen.getByText("1x")).toBeInTheDocument();
  });

  it("displays track title on larger screens", () => {
    render(<PlayerBar />);
    expect(screen.getByText("Test Track")).toBeInTheDocument();
  });

  it("calls togglePlayPause on play/pause click", () => {
    render(<PlayerBar />);
    fireEvent.click(screen.getByLabelText("Play"));
    expect(mockContext.togglePlayPause).toHaveBeenCalled();
  });

  it("calls skipToNext on next click", () => {
    render(<PlayerBar />);
    fireEvent.click(screen.getByLabelText("Next"));
    expect(mockContext.skipToNext).toHaveBeenCalled();
  });

  it("calls skipToPrevious on previous click", () => {
    render(<PlayerBar />);
    fireEvent.click(screen.getByLabelText("Previous"));
    expect(mockContext.skipToPrevious).toHaveBeenCalled();
  });

  it("calls cycleSpeed on speed button click", () => {
    render(<PlayerBar />);
    fireEvent.click(screen.getByText("1x"));
    expect(mockContext.cycleSpeed).toHaveBeenCalled();
  });
});
