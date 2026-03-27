"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "audio-playback-state";
const SAVE_INTERVAL_MS = 5000;

interface PlaybackState {
  queueItemId: string;
  position: number;
  playbackRate: number;
  savedAt: number;
}

function saveState(
  currentItemId: string | null,
  currentTime: number,
  playbackRate: number,
) {
  if (!currentItemId || currentTime === 0) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        queueItemId: currentItemId,
        position: currentTime,
        playbackRate,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // localStorage might be full or unavailable
  }
}

/**
 * Persists playback position to localStorage.
 * Simple v1 -- no server sync, just local persistence.
 */
export function usePlaybackPersistence(
  currentItemId: string | null,
  currentTime: number,
  playbackRate: number,
) {
  const lastSave = useRef(0);

  // Keep refs in sync so cleanup / event handlers always read current values
  const itemIdRef = useRef(currentItemId);
  const timeRef = useRef(currentTime);
  const rateRef = useRef(playbackRate);

  useEffect(() => { itemIdRef.current = currentItemId; }, [currentItemId]);
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { rateRef.current = playbackRate; }, [playbackRate]);

  // Save periodically
  useEffect(() => {
    if (!currentItemId || currentTime === 0) return;

    const now = Date.now();
    if (now - lastSave.current < SAVE_INTERVAL_MS) return;

    lastSave.current = now;
    saveState(currentItemId, currentTime, playbackRate);
  }, [currentItemId, currentTime, playbackRate]);

  // Immediate save helper reading from refs
  const saveNow = useCallback(() => {
    saveState(itemIdRef.current, timeRef.current, rateRef.current);
  }, []);

  // Save on beforeunload and visibilitychange
  useEffect(() => {
    const onBeforeUnload = () => saveNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [saveNow]);

  // Save on unmount (reads from refs, never stale)
  useEffect(() => {
    return () => {
      saveNow();
    };
  }, [saveNow]);
}

export function getPersistedPlayback(): PlaybackState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state: PlaybackState = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}
