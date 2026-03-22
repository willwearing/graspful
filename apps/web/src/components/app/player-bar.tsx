"use client";

import { useEffect } from "react";
import { useAudioPlayer } from "@/lib/hooks/use-audio-player";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    currentItem,
    queue,
    togglePlayPause,
    cycleSpeed,
    skipToNext,
    skipToPrevious,
    seek,
  } = useAudioPlayer();

  // Space bar toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      ) {
        e.preventDefault();
        togglePlayPause();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause]);

  if (queue.length === 0) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
      role="region"
      aria-label="Audio player"
    >
      {/* Progress bar — visible h-2 with larger invisible touch target */}
      <div
        className="relative cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          seek(pct * duration);
        }}
        role="progressbar"
        aria-label="Audio playback progress"
        aria-valuenow={currentTime}
        aria-valuemax={duration}
      >
        {/* Invisible touch target (44px tall for accessibility) */}
        <div className="absolute inset-x-0 -top-5 h-11" />
        {/* Visible bar */}
        <div className="h-2 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 sm:gap-4">
        {/* Time */}
        <span className="min-w-[3rem] text-xs text-muted-foreground tabular-nums">
          {formatTime(currentTime)}
        </span>

        {/* Center controls */}
        <div className="flex flex-1 items-center justify-center gap-3">
          <button
            onClick={skipToPrevious}
            className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors"
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlayPause}
            className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={skipToNext}
            className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors"
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Right side: speed + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleSpeed}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors tabular-nums"
            aria-label={`Playback speed ${playbackRate}x`}
          >
            {playbackRate}x
          </button>
          {currentItem && (
            <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:block">
              {currentItem.title}
            </span>
          )}
        </div>

        {/* Duration */}
        <span className="min-w-[3rem] text-right text-xs text-muted-foreground tabular-nums">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
