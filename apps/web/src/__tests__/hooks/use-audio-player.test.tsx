import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AudioPlayerProvider, useAudioPlayer, type QueueItem } from "@/lib/contexts/audio-player-context";
import type { ReactNode } from "react";

// Mock HTMLAudioElement
class MockAudioElement {
  src = "";
  currentTime = 0;
  duration = 0;
  paused = true;
  playbackRate = 1;
  preload = "";
  private listeners: Record<string, Function[]> = {};

  play = vi.fn().mockImplementation(() => {
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });

  addEventListener = vi.fn().mockImplementation((event: string, handler: Function) => {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  });

  removeEventListener = vi.fn().mockImplementation((event: string, handler: Function) => {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
    }
  });

  emit(event: string) {
    (this.listeners[event] ?? []).forEach((h) => h());
  }
}

let mockAudio: MockAudioElement;

beforeEach(() => {
  mockAudio = new MockAudioElement();
  vi.stubGlobal("Audio", function () { return mockAudio; });
});

function wrapper({ children }: { children: ReactNode }) {
  return <AudioPlayerProvider>{children}</AudioPlayerProvider>;
}

const testItems: QueueItem[] = [
  { id: "item-1", title: "First Item", audioUrl: "https://example.com/1.flac" },
  { id: "item-2", title: "Second Item", audioUrl: "https://example.com/2.flac" },
  { id: "item-3", title: "Third Item", audioUrl: "https://example.com/3.flac" },
];

describe("useAudioPlayer", () => {
  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useAudioPlayer());
    }).toThrow("useAudioPlayer must be used within AudioPlayerProvider");
  });

  it("provides initial state", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.playbackRate).toBe(1);
    expect(result.current.error).toBeNull();
    expect(result.current.currentItem).toBeNull();
    expect(result.current.queue).toEqual([]);
    expect(result.current.queueIndex).toBe(0);
  });

  it("loadQueue sets queue and current item", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    expect(result.current.queue).toEqual(testItems);
    expect(result.current.currentItem).toEqual(testItems[0]);
    expect(result.current.queueIndex).toBe(0);
  });

  it("loadQueue with startIndex", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems, 1);
    });

    expect(result.current.queueIndex).toBe(1);
    expect(result.current.currentItem).toEqual(testItems[1]);
  });

  it("play calls audio.play", async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    await act(async () => {
      result.current.play();
    });

    // play was called (once in loadQueue, once explicitly)
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("pause calls audio.pause", async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    act(() => {
      result.current.pause();
    });

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it("togglePlayPause toggles state", async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    // Initially after loadQueue, play is called
    // Toggle should pause
    mockAudio.paused = false;
    act(() => {
      result.current.togglePlayPause();
    });
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("seek updates currentTime", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    act(() => {
      result.current.seek(30);
    });

    expect(mockAudio.currentTime).toBe(30);
    expect(result.current.currentTime).toBe(30);
  });

  it("setSpeed updates playback rate", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.setSpeed(1.5);
    });

    expect(result.current.playbackRate).toBe(1.5);
    expect(mockAudio.playbackRate).toBe(1.5);
  });

  it("cycleSpeed cycles through speed options", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    // 1 -> 1.25
    act(() => result.current.cycleSpeed());
    expect(result.current.playbackRate).toBe(1.25);

    // 1.25 -> 1.5
    act(() => result.current.cycleSpeed());
    expect(result.current.playbackRate).toBe(1.5);
  });

  it("skipToNext advances queue index", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    act(() => {
      result.current.skipToNext();
    });

    expect(result.current.queueIndex).toBe(1);
    expect(result.current.currentItem).toEqual(testItems[1]);
  });

  it("skipToNext does not go past end", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems, 2); // last item
    });

    act(() => {
      result.current.skipToNext();
    });

    expect(result.current.queueIndex).toBe(2);
  });

  it("skipToPrevious goes back when near start of track", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems, 1);
    });

    mockAudio.currentTime = 1; // less than 3 seconds
    act(() => {
      result.current.skipToPrevious();
    });

    expect(result.current.queueIndex).toBe(0);
  });

  it("skipToPrevious restarts track when past 3 seconds", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems, 1);
    });

    mockAudio.currentTime = 10;
    act(() => {
      result.current.skipToPrevious();
    });

    expect(mockAudio.currentTime).toBe(0);
    expect(result.current.queueIndex).toBe(1); // stays on same track
  });

  it("clear resets all state", () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    act(() => {
      result.current.loadQueue(testItems);
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.queue).toEqual([]);
    expect(result.current.currentItem).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });
});
