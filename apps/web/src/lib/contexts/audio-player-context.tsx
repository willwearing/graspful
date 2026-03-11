"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMediaSession } from "@/lib/hooks/use-media-session";
import { usePlaybackPersistence } from "@/lib/hooks/use-playback-persistence";

export interface QueueItem {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

interface AudioPlayerContextValue {
  // State
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  error: string | null;
  currentItem: QueueItem | null;
  queue: QueueItem[];
  queueIndex: number;

  // Actions
  loadQueue: (items: QueueItem[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
  cycleSpeed: () => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  clear: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref for queue so onEnded always reads current value
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const currentItem = queue[queueIndex] ?? null;

  // Create audio element on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Load audio source when current item changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentItem) return;

    setIsLoading(true);
    setError(null);
    audio.src = currentItem.audioUrl;
    audio.playbackRate = playbackRate;

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      // Use ref to avoid stale closure over queue
      const q = queueRef.current;
      setQueueIndex((prev) => {
        if (prev < q.length - 1) {
          // Don't set isPlaying(false) when advancing -- avoids pause button flicker
          return prev + 1;
        }
        // Last track finished -- stop
        setIsPlaying(false);
        return prev;
      });
    };

    const onError = () => {
      setError("Failed to load audio");
      setIsLoading(false);
      setIsPlaying(false);
    };

    const onCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.id, currentItem?.audioUrl]);

  // Auto-play when queue index changes (except initial load)
  const isFirstLoad = useRef(true);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentItem) return;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    // When we advance to next item, try to play
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIndex]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
    setPlaybackRate(speed);
  }, []);

  const cycleSpeed = useCallback(() => {
    setPlaybackRate((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      const audio = audioRef.current;
      if (audio) audio.playbackRate = next;
      return next;
    });
  }, []);

  const skipToNext = useCallback(() => {
    setQueueIndex((prev) => Math.min(prev + 1, queueRef.current.length - 1));
  }, []);

  const skipToPrevious = useCallback(() => {
    const audio = audioRef.current;
    // If more than 3 seconds in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setQueueIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const loadQueue = useCallback(
    (items: QueueItem[], startIndex = 0) => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setQueue(items);
      setQueueIndex(startIndex);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setError(null);
      isFirstLoad.current = false;

      // Don't set audio.src here -- let the useEffect handle it
      // when currentItem changes. This avoids a race condition where
      // both loadQueue and the useEffect set src and call play().
    },
    [],
  );

  const clear = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setQueue([]);
    setQueueIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
    isFirstLoad.current = true;
  }, []);

  // Wire up useMediaSession (P1 #5)
  useMediaSession({
    currentItem,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    onPlay: play,
    onPause: pause,
    onSeekForward: () => seek(Math.min(currentTime + 15, duration)),
    onSeekBackward: () => seek(Math.max(currentTime - 15, 0)),
    onNextTrack: skipToNext,
    onPreviousTrack: skipToPrevious,
  });

  // Wire up usePlaybackPersistence (P1 #5)
  usePlaybackPersistence(currentItem?.id ?? null, currentTime, playbackRate);

  const value: AudioPlayerContextValue = {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    error,
    currentItem,
    queue,
    queueIndex,
    loadQueue,
    play,
    pause,
    togglePlayPause,
    seek,
    setSpeed,
    cycleSpeed,
    skipToNext,
    skipToPrevious,
    clear,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
