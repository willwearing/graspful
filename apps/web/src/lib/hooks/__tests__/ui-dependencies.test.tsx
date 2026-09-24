import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Ordering } from "@/components/app/problems/ordering";
import { useLessonAudio } from "../use-lesson-audio";
import { useMediaSession } from "../use-media-session";
import type { Problem } from "@/lib/types";

const apiFetch = vi.hoisted(() => vi.fn().mockResolvedValue({ url: "wrong-url" }));
vi.mock("@/lib/api-client", () => ({ apiClientFetch: apiFetch }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("stable learning dependencies", () => {
  it("preserves ordering progress when the same problem is recreated", () => {
    const problem: Problem = { id: "p", difficulty: 1, type: "ordering", questionText: "Order", items: ["First", "Second"] };
    const submit = vi.fn();
    const view = render(<Ordering problem={problem} onSubmit={submit} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Move down" })[0]);
    view.rerender(<Ordering problem={{ ...problem, items: [...problem.items!] }} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(submit).toHaveBeenLastCalledWith(["Second", "First"]);
    view.rerender(<Ordering problem={{ ...problem, id: "other" }} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(submit).toHaveBeenLastCalledWith(["First", "Second"]);
  });

  it("uses embedded lesson audio and updates a new lesson of the same length without requests", () => {
    const points = [{ id: "one", instructionAudioUrl: "one.mp3" }];
    const { result, rerender } = renderHook(({ knowledgePoints }) => useLessonAudio(knowledgePoints), { initialProps: { knowledgePoints: points } });
    expect(result.current.audioUrls.get("one")?.instructionUrl).toBe("one.mp3");
    rerender({ knowledgePoints: [{ id: "two", instructionAudioUrl: "two.mp3" }] });
    expect(result.current.audioUrls.has("one")).toBe(false);
    expect(result.current.audioUrls.get("two")?.instructionUrl).toBe("two.mp3");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("does not replace media metadata when only the queue object identity changes", () => {
    const metadata = vi.fn();
    const session = { setPositionState: vi.fn(), setActionHandler: vi.fn(), playbackState: "paused" };
    Object.defineProperty(session, "metadata", { set: metadata });
    vi.stubGlobal("navigator", { mediaSession: session });
    vi.stubGlobal("MediaMetadata", class { constructor(public data: unknown) {} });
    const callbacks = { onPlay: vi.fn(), onPause: vi.fn(), onSeekForward: vi.fn(), onSeekBackward: vi.fn(), onNextTrack: vi.fn(), onPreviousTrack: vi.fn() };
    const options = { currentItem: { id: "one", title: "Lesson", audioUrl: "one.mp3" }, isPlaying: false, currentTime: 0, duration: 5, playbackRate: 1, ...callbacks };
    const { rerender } = renderHook(({ item }) => useMediaSession({ ...options, currentItem: item }), { initialProps: { item: options.currentItem } });
    act(() => rerender({ item: { ...options.currentItem } }));
    expect(metadata).toHaveBeenCalledTimes(1);
    act(() => rerender({ item: { ...options.currentItem, title: "Next lesson" } }));
    expect(metadata).toHaveBeenCalledTimes(2);
  });
});
