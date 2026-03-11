/**
 * IndexedDB storage layer for offline audio playback.
 *
 * Two object stores in a single DB ("niche-audio-prep-audio", version 1):
 * - audio_chunks: compound key [entryId, chunkIndex], index on entryId
 * - entry_meta: keyPath entryId
 *
 * One entry = one voice/model at a time. Compound key is [entryId, chunkIndex] only.
 */

const DB_NAME = "niche-audio-prep-audio";
const DB_VERSION = 1;
const CHUNKS_STORE = "audio_chunks";
const META_STORE = "entry_meta";

export interface IDBChunkRecord {
  entryId: string;
  chunkIndex: number;
  voice: string;
  model: string;
  textHash: string;
  audioBlob: Blob;
  duration: number | null;
  sizeBytes: number;
  createdAt: number;
}

export interface IDBEntryMeta {
  entryId: string;
  totalChunks: number;
  downloadedChunks: number;
  totalBytes: number;
  downloadedAt: number | null; // null = incomplete
}

export function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const store = db.createObjectStore(CHUNKS_STORE, {
          keyPath: ["entryId", "chunkIndex"],
        });
        store.createIndex("entryId", "entryId", { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "entryId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getChunk(
  db: IDBDatabase,
  entryId: string,
  chunkIndex: number,
): Promise<IDBChunkRecord | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, "readonly");
    const store = tx.objectStore(CHUNKS_STORE);
    const req = store.get([entryId, chunkIndex]);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export function putChunk(
  db: IDBDatabase,
  record: IDBChunkRecord,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHUNKS_STORE, META_STORE], "readwrite");
    const chunkStore = tx.objectStore(CHUNKS_STORE);
    const metaStore = tx.objectStore(META_STORE);

    chunkStore.put(record);

    // Update entry_meta: increment downloadedChunks and totalBytes
    const metaReq = metaStore.get(record.entryId);
    metaReq.onsuccess = () => {
      const meta: IDBEntryMeta = metaReq.result ?? {
        entryId: record.entryId,
        totalChunks: 0,
        downloadedChunks: 0,
        totalBytes: 0,
        downloadedAt: null,
      };

      // Count actual chunks via cursor would be expensive; just increment.
      // The meta is authoritative only after initEntryMeta sets totalChunks.
      meta.downloadedChunks = Math.min(
        meta.downloadedChunks + 1,
        meta.totalChunks || Infinity,
      );
      meta.totalBytes += record.sizeBytes;

      if (
        meta.totalChunks > 0 &&
        meta.downloadedChunks >= meta.totalChunks
      ) {
        meta.downloadedAt = Date.now();
      }

      metaStore.put(meta);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function updateChunkDuration(
  db: IDBDatabase,
  entryId: string,
  chunkIndex: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, "readwrite");
    const store = tx.objectStore(CHUNKS_STORE);
    const req = store.get([entryId, chunkIndex]);

    req.onsuccess = () => {
      const record: IDBChunkRecord | undefined = req.result;
      if (record) {
        record.duration = duration;
        store.put(record);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function deleteEntryAudio(
  db: IDBDatabase,
  entryId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHUNKS_STORE, META_STORE], "readwrite");
    const chunkStore = tx.objectStore(CHUNKS_STORE);
    const metaStore = tx.objectStore(META_STORE);

    // Delete all chunks by entryId index via cursor
    const index = chunkStore.index("entryId");
    const cursor = index.openCursor(IDBKeyRange.only(entryId));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };

    // Delete meta
    metaStore.delete(entryId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getEntryMeta(
  db: IDBDatabase,
  entryId: string,
): Promise<IDBEntryMeta | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const req = store.get(entryId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export function getAllEntryMetas(
  db: IDBDatabase,
): Promise<IDBEntryMeta[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function initEntryMeta(
  db: IDBDatabase,
  entryId: string,
  totalChunks: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    const store = tx.objectStore(META_STORE);
    const req = store.get(entryId);

    req.onsuccess = () => {
      const existing: IDBEntryMeta | undefined = req.result;
      if (existing) {
        // Update totalChunks if not set, preserve download progress
        existing.totalChunks = totalChunks;
        if (existing.downloadedChunks >= totalChunks) {
          existing.downloadedAt = existing.downloadedAt ?? Date.now();
        }
        store.put(existing);
      } else {
        store.put({
          entryId,
          totalChunks,
          downloadedChunks: 0,
          totalBytes: 0,
          downloadedAt: null,
        });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
