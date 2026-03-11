"use client";

import { useCallback, useEffect, useState } from "react";
import {
  openAudioDB,
  putChunk,
  getChunk,
  getEntryMeta,
  getAllEntryMetas,
  initEntryMeta,
  deleteEntryAudio,
  type IDBEntryMeta,
} from "@/lib/idb-audio-store";
import type { QueueItem } from "@/lib/contexts/audio-player-context";

export type DownloadStatus = "pending" | "downloading" | "complete" | "error";

export interface OfflineAudio {
  isReady: boolean;
  downloadStatus: Map<string, DownloadStatus>;
  usedBytes: number;
  downloadLesson: (lessonKPs: QueueItem[]) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
  isLessonDownloaded: (lessonId: string) => boolean;
  getAudioBlob: (itemId: string) => Promise<Blob | null>;
  clearAll: () => Promise<void>;
}

export function useOfflineAudio(): OfflineAudio {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<Map<string, DownloadStatus>>(new Map());
  const [usedBytes, setUsedBytes] = useState(0);
  const [metas, setMetas] = useState<Map<string, IDBEntryMeta>>(new Map());
  const isReady = db !== null;

  // Open DB on mount
  useEffect(() => {
    let cancelled = false;
    openAudioDB().then((database) => {
      if (!cancelled) {
        setDb(database);
        // Load existing metas
        getAllEntryMetas(database).then((allMetas) => {
          const metaMap = new Map<string, IDBEntryMeta>();
          let bytes = 0;
          for (const meta of allMetas) {
            metaMap.set(meta.entryId, meta);
            bytes += meta.totalBytes;
          }
          setMetas(metaMap);
          setUsedBytes(bytes);
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  const downloadLesson = useCallback(async (lessonKPs: QueueItem[]) => {
    if (!db) return;

    for (const item of lessonKPs) {
      setDownloadStatus((prev) => new Map(prev).set(item.id, "downloading"));

      try {
        // Initialize meta with 1 chunk (pre-generated audio = 1 file per item)
        await initEntryMeta(db, item.id, 1);

        // Download audio from signed URL
        const response = await fetch(item.audioUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const blob = await response.blob();

        await putChunk(db, {
          entryId: item.id,
          chunkIndex: 0,
          voice: "af_heart",
          model: "kokoro",
          textHash: "",
          audioBlob: blob,
          duration: item.durationSeconds ?? null,
          sizeBytes: blob.size,
          createdAt: Date.now(),
        });

        setDownloadStatus((prev) => new Map(prev).set(item.id, "complete"));

        // Update meta cache
        const meta = await getEntryMeta(db, item.id);
        if (meta) {
          setMetas((prev) => new Map(prev).set(item.id, meta));
          setUsedBytes((prev) => prev + blob.size);
        }
      } catch {
        setDownloadStatus((prev) => new Map(prev).set(item.id, "error"));
      }
    }
  }, [db]);

  const deleteLesson = useCallback(async (lessonId: string) => {
    if (!db) return;
    const meta = metas.get(lessonId);
    await deleteEntryAudio(db, lessonId);
    setMetas((prev) => {
      const next = new Map(prev);
      next.delete(lessonId);
      return next;
    });
    if (meta) {
      setUsedBytes((prev) => Math.max(0, prev - meta.totalBytes));
    }
    setDownloadStatus((prev) => {
      const next = new Map(prev);
      next.delete(lessonId);
      return next;
    });
  }, [db, metas]);

  const isLessonDownloaded = useCallback((lessonId: string): boolean => {
    const meta = metas.get(lessonId);
    return meta?.downloadedAt !== null && meta?.downloadedAt !== undefined;
  }, [metas]);

  const getAudioBlob = useCallback(async (itemId: string): Promise<Blob | null> => {
    if (!db) return null;
    const chunk = await getChunk(db, itemId, 0);
    return chunk?.audioBlob ?? null;
  }, [db]);

  const clearAll = useCallback(async () => {
    if (!db) return;
    const allMetas = await getAllEntryMetas(db);
    for (const meta of allMetas) {
      await deleteEntryAudio(db, meta.entryId);
    }
    setMetas(new Map());
    setUsedBytes(0);
    setDownloadStatus(new Map());
  }, [db]);

  return {
    isReady,
    downloadStatus,
    usedBytes,
    downloadLesson,
    deleteLesson,
    isLessonDownloaded,
    getAudioBlob,
    clearAll,
  };
}
