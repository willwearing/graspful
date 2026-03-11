"use client";

import { useEffect } from "react";
import type { QueueItem } from "@/lib/contexts/audio-player-context";

interface MediaSessionOptions {
  currentItem: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
}

export function useMediaSession(options: MediaSessionOptions) {
  const {
    currentItem,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    onPlay,
    onPause,
    onSeekForward,
    onSeekBackward,
    onNextTrack,
    onPreviousTrack,
  } = options;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    if (!currentItem) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentItem.title,
      artist: "Audio Lesson",
    });
  }, [currentItem]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.setPositionState({
      duration: duration || 0,
      playbackRate,
      position: Math.min(currentTime, duration || 0),
    });
  }, [currentTime, duration, playbackRate]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("seekforward", onSeekForward);
    navigator.mediaSession.setActionHandler("seekbackward", onSeekBackward);
    navigator.mediaSession.setActionHandler("nexttrack", onNextTrack);
    navigator.mediaSession.setActionHandler("previoustrack", onPreviousTrack);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [onPlay, onPause, onSeekForward, onSeekBackward, onNextTrack, onPreviousTrack]);
}
