import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import {
  openAudioDB,
  getChunk,
  putChunk,
  getEntryMeta,
  getAllEntryMetas,
  initEntryMeta,
  deleteEntryAudio,
  updateChunkDuration,
  type IDBChunkRecord,
} from "@/lib/idb-audio-store";

function makeChunk(
  entryId: string,
  chunkIndex: number,
  overrides?: Partial<IDBChunkRecord>,
): IDBChunkRecord {
  return {
    entryId,
    chunkIndex,
    voice: "af_heart",
    model: "kokoro",
    textHash: "abc123",
    audioBlob: new Blob(["audio data"], { type: "audio/flac" }),
    duration: null,
    sizeBytes: 100,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("idb-audio-store", () => {
  let db: IDBDatabase;

  beforeEach(async () => {
    db = await openAudioDB();
  });

  afterEach(() => {
    db.close();
    // Delete the database to ensure clean state between tests
    indexedDB.deleteDatabase("graspful-audio");
  });

  describe("openAudioDB", () => {
    it("should open the database with correct stores", () => {
      expect(db.objectStoreNames.contains("audio_chunks")).toBe(true);
      expect(db.objectStoreNames.contains("entry_meta")).toBe(true);
    });
  });

  describe("putChunk / getChunk", () => {
    it("should store and retrieve a chunk", async () => {
      const chunk = makeChunk("entry-1", 0);
      await putChunk(db, chunk);

      const retrieved = await getChunk(db, "entry-1", 0);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.entryId).toBe("entry-1");
      expect(retrieved!.chunkIndex).toBe(0);
      expect(retrieved!.voice).toBe("af_heart");
    });

    it("should return null for nonexistent chunk", async () => {
      const result = await getChunk(db, "nonexistent", 0);
      expect(result).toBeNull();
    });

    it("should update entry meta when putting a chunk", async () => {
      await initEntryMeta(db, "entry-1", 2);
      await putChunk(db, makeChunk("entry-1", 0));

      const meta = await getEntryMeta(db, "entry-1");
      expect(meta).not.toBeNull();
      expect(meta!.downloadedChunks).toBe(1);
      expect(meta!.totalBytes).toBe(100);
    });
  });

  describe("updateChunkDuration", () => {
    it("should update duration on an existing chunk", async () => {
      const chunk = makeChunk("entry-1", 0);
      await putChunk(db, chunk);

      await updateChunkDuration(db, "entry-1", 0, 5.5);

      const updated = await getChunk(db, "entry-1", 0);
      expect(updated!.duration).toBe(5.5);
    });
  });

  describe("initEntryMeta", () => {
    it("should create meta for a new entry", async () => {
      await initEntryMeta(db, "entry-1", 3);

      const meta = await getEntryMeta(db, "entry-1");
      expect(meta).not.toBeNull();
      expect(meta!.totalChunks).toBe(3);
      expect(meta!.downloadedChunks).toBe(0);
      expect(meta!.downloadedAt).toBeNull();
    });

    it("should update totalChunks for existing meta", async () => {
      await initEntryMeta(db, "entry-1", 3);
      await initEntryMeta(db, "entry-1", 5);

      const meta = await getEntryMeta(db, "entry-1");
      expect(meta!.totalChunks).toBe(5);
    });

    it("should set downloadedAt when all chunks are present", async () => {
      await initEntryMeta(db, "entry-1", 2);
      await putChunk(db, makeChunk("entry-1", 0));
      await putChunk(db, makeChunk("entry-1", 1));

      // Re-init with same totalChunks
      await initEntryMeta(db, "entry-1", 2);

      const meta = await getEntryMeta(db, "entry-1");
      expect(meta!.downloadedAt).not.toBeNull();
    });
  });

  describe("getEntryMeta / getAllEntryMetas", () => {
    it("should return null for nonexistent entry", async () => {
      const meta = await getEntryMeta(db, "nonexistent");
      expect(meta).toBeNull();
    });

    it("should return all metas", async () => {
      await initEntryMeta(db, "entry-1", 2);
      await initEntryMeta(db, "entry-2", 3);

      const metas = await getAllEntryMetas(db);
      expect(metas).toHaveLength(2);
    });
  });

  describe("deleteEntryAudio", () => {
    it("should delete all chunks and meta for an entry", async () => {
      await initEntryMeta(db, "entry-1", 2);
      await putChunk(db, makeChunk("entry-1", 0));
      await putChunk(db, makeChunk("entry-1", 1));

      await deleteEntryAudio(db, "entry-1");

      const chunk = await getChunk(db, "entry-1", 0);
      expect(chunk).toBeNull();

      const meta = await getEntryMeta(db, "entry-1");
      expect(meta).toBeNull();
    });

    it("should not affect other entries", async () => {
      await initEntryMeta(db, "entry-1", 1);
      await putChunk(db, makeChunk("entry-1", 0));
      await initEntryMeta(db, "entry-2", 1);
      await putChunk(db, makeChunk("entry-2", 0));

      await deleteEntryAudio(db, "entry-1");

      const chunk2 = await getChunk(db, "entry-2", 0);
      expect(chunk2).not.toBeNull();
    });
  });
});
