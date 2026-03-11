import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOfflineAudio } from "@/lib/hooks/use-offline-audio";
import type { QueueItem } from "@/lib/contexts/audio-player-context";

// Mock the IDB store module
const mockDb = {};
const mockOpenAudioDB = vi.fn().mockResolvedValue(mockDb);
const mockGetAllEntryMetas = vi.fn().mockResolvedValue([]);
const mockInitEntryMeta = vi.fn().mockResolvedValue(undefined);
const mockPutChunk = vi.fn().mockResolvedValue(undefined);
const mockGetChunk = vi.fn().mockResolvedValue(null);
const mockGetEntryMeta = vi.fn().mockResolvedValue(null);
const mockDeleteEntryAudio = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/idb-audio-store", () => ({
  openAudioDB: (...args: unknown[]) => mockOpenAudioDB(...args),
  getAllEntryMetas: (...args: unknown[]) => mockGetAllEntryMetas(...args),
  initEntryMeta: (...args: unknown[]) => mockInitEntryMeta(...args),
  putChunk: (...args: unknown[]) => mockPutChunk(...args),
  getChunk: (...args: unknown[]) => mockGetChunk(...args),
  getEntryMeta: (...args: unknown[]) => mockGetEntryMeta(...args),
  deleteEntryAudio: (...args: unknown[]) => mockDeleteEntryAudio(...args),
}));

describe("useOfflineAudio", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAudioDB.mockResolvedValue(mockDb);
    mockGetAllEntryMetas.mockResolvedValue([]);
    globalThis.fetch = originalFetch;
  });

  it("initializes with isReady=true after DB opens", async () => {
    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it("downloads audio and marks as complete", async () => {
    const audioBlob = new Blob(["fake audio data"], { type: "audio/flac" });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(audioBlob),
    });

    mockGetEntryMeta.mockResolvedValue({
      entryId: "item-1",
      totalChunks: 1,
      downloadedChunks: 1,
      totalBytes: audioBlob.size,
      downloadedAt: Date.now(),
    });

    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const items: QueueItem[] = [
      {
        id: "item-1",
        title: "Test Item",
        audioUrl: "https://example.com/audio.flac",
        durationSeconds: 30,
      },
    ];

    await act(async () => {
      await result.current.downloadLesson(items);
    });

    expect(result.current.downloadStatus.get("item-1")).toBe("complete");
    expect(mockInitEntryMeta).toHaveBeenCalledWith(mockDb, "item-1", 1);
    expect(mockPutChunk).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        entryId: "item-1",
        chunkIndex: 0,
      }),
    );
  });

  it("retrieves audio blob after download", async () => {
    const audioBlob = new Blob(["fake audio bytes"], { type: "audio/flac" });
    mockGetChunk.mockResolvedValue({
      entryId: "item-1",
      chunkIndex: 0,
      audioBlob,
    });

    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.getAudioBlob("item-1");
    });

    expect(blob).not.toBeNull();
    expect(mockGetChunk).toHaveBeenCalledWith(mockDb, "item-1", 0);
  });

  it("returns null for non-downloaded audio", async () => {
    mockGetChunk.mockResolvedValue(null);

    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.getAudioBlob("nonexistent");
    });

    expect(blob).toBeNull();
  });

  it("handles download errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.downloadLesson([
        { id: "item-1", title: "Test", audioUrl: "https://example.com/fail.flac" },
      ]);
    });

    expect(result.current.downloadStatus.get("item-1")).toBe("error");
  });

  it("deletes downloaded audio", async () => {
    const audioBlob = new Blob(["data"], { type: "audio/flac" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(audioBlob),
    });

    mockGetEntryMeta.mockResolvedValue({
      entryId: "item-1",
      totalChunks: 1,
      downloadedChunks: 1,
      totalBytes: audioBlob.size,
      downloadedAt: Date.now(),
    });

    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Download first
    await act(async () => {
      await result.current.downloadLesson([
        { id: "item-1", title: "Test", audioUrl: "https://example.com/audio.flac" },
      ]);
    });

    // Delete
    await act(async () => {
      await result.current.deleteLesson("item-1");
    });

    expect(mockDeleteEntryAudio).toHaveBeenCalledWith(mockDb, "item-1");
  });

  it("isLessonDownloaded returns true for completed downloads", async () => {
    const audioBlob = new Blob(["data"], { type: "audio/flac" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(audioBlob),
    });

    mockGetEntryMeta.mockResolvedValue({
      entryId: "item-1",
      totalChunks: 1,
      downloadedChunks: 1,
      totalBytes: audioBlob.size,
      downloadedAt: Date.now(),
    });

    const { result } = renderHook(() => useOfflineAudio());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.downloadLesson([
        { id: "item-1", title: "Test", audioUrl: "https://example.com/audio.flac" },
      ]);
    });

    expect(result.current.isLessonDownloaded("item-1")).toBe(true);
    expect(result.current.isLessonDownloaded("nonexistent")).toBe(false);
  });
});
