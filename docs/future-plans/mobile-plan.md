# Niche Audio Prep: Mobile App Architecture Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status:** Deferred

> **This plan is deferred.** The web platform (mobile-responsive) will be built and validated first. Native mobile apps will be built after the web platform has paying users. See PLAN.md for the current execution order.

**Goal:** Build a production mobile app for audio exam prep that works offline, plays in the background, and shares maximum code with the existing Next.js web frontend.

**Architecture:** React Native (Expo) app using react-native-track-player for background audio, WatermelonDB for offline storage with sync, and a monorepo structure that shares TypeScript business logic, API clients, and types between web and mobile. White-label theming is driven by runtime config, matching the web approach.

**Tech Stack:** React Native (Expo SDK 52+), react-native-track-player, WatermelonDB, Expo Router, Zustand, Expo Notifications, EAS Build/Submit

---

## Table of Contents

1. [Framework Decision: React Native vs Flutter](#1-framework-decision)
2. [White-Label / App Store Strategy](#2-white-label--app-store-strategy)
3. [Project Structure](#3-project-structure)
4. [Audio Engine Architecture](#4-audio-engine-architecture)
5. [Offline Sync Architecture](#5-offline-sync-architecture)
6. [Push Notification System](#6-push-notification-system)
7. [Component Sharing Strategy with Web](#7-component-sharing-strategy-with-web)
8. [App Store Deployment Pipeline](#8-app-store-deployment-pipeline)
9. [Task Breakdown](#9-task-breakdown)

---

## 1. Framework Decision

### Recommendation: React Native (Expo)

**Flutter was seriously considered.** Its audio story is arguably better out of the box -- `just_audio` + `audio_service` is a mature, well-documented stack for background audio apps. Flutter also produces silky 60fps animations and has a single rendering engine across platforms, which eliminates a class of platform-specific bugs.

**But React Native wins for this project for three reasons:**

**Reason 1: Code reuse is the whole point.** The web frontend is Next.js + React + TypeScript. The business logic -- study progress calculations, spaced repetition algorithms, API client, content models, type definitions -- is all TypeScript. With React Native, we share that code directly via a monorepo. With Flutter (Dart), every line of business logic gets rewritten. For a small team, maintaining two languages for the same logic is a non-starter.

**Reason 2: The audio gap is closed.** `react-native-track-player` (RNTP) is a battle-tested library specifically built for background audio playback on both iOS and Android. It handles:
- Lock screen controls and notification player
- Background playback that survives app suspension
- Queue management (playlist-style)
- Playback speed control
- Remote control events (Bluetooth, CarPlay, Android Auto)
- Gapless playback between tracks

This is exactly what we need. The try-listening prototype's `useAudioPlayer` hook manages chunk-based playback with prefetching, speed control, and seek -- all of which map cleanly to RNTP's queue-based API.

**Reason 3: Expo makes native painful things easy.** Expo SDK 52+ with the new architecture (Fabric renderer, JSI) gives us:
- EAS Build for CI/CD without maintaining Xcode/Gradle configs
- EAS Submit for App Store/Play Store submission
- `expo-notifications` for push notifications
- `expo-file-system` for download management
- `expo-av` as a fallback audio engine if needed
- Config plugins for native module configuration without ejecting

**What we lose vs. Flutter:**
- Slightly worse animation performance (mitigated by Reanimated 3)
- Less predictable UI across platforms (mitigated by careful component design)
- Larger app bundle (mitigated by Hermes JS engine, ~7-10MB vs Flutter's ~5MB)

**These tradeoffs are acceptable.** This is an audio app, not a graphics-intensive game. The primary UI is a player bar, a list of study items, and progress charts. React Native handles this with ease.

### Library Recommendations

| Concern | Library | Why |
|---------|---------|-----|
| **Audio playback** | `react-native-track-player` v4 | Background audio, lock screen, queue management, speed control. The standard for audio apps in RN. |
| **Offline storage** | `@nozbe/watermelondb` | Lazy-loading SQLite ORM with built-in sync protocol. Handles 10K+ records without jank. |
| **Navigation** | `expo-router` v4 | File-based routing matching Next.js conventions. Shared mental model with web. |
| **State management** | `zustand` | Tiny, TypeScript-first, works identically on web and mobile. No Provider boilerplate. |
| **Push notifications** | `expo-notifications` | Managed workflow, handles both iOS APNs and Android FCM. |
| **Downloads** | `expo-file-system` | Background downloads, file management, storage stats. |
| **Animations** | `react-native-reanimated` v3 | 60fps UI thread animations for player gestures (swipe-to-dismiss, scrubber). |
| **Gestures** | `react-native-gesture-handler` | Swipe gestures for player, pull-to-refresh, long-press bookmarking. |
| **HTTP client** | `ky` or plain `fetch` | Same client used on web. Wrap in shared API client package. |
| **Styling** | `nativewind` v4 | Tailwind CSS for React Native. Matches web's Tailwind classes. |
| **Icons** | `@expo/vector-icons` | Icon library included with Expo. |
| **Secure storage** | `expo-secure-store` | Auth tokens, user preferences. |
| **Background tasks** | `expo-background-fetch` + `expo-task-manager` | Periodic sync when app is backgrounded. |

---

## 2. White-Label / App Store Strategy

### Recommendation: One App Per Niche (Separate Store Listings)

This is not close. Separate apps win decisively for this market.

**Why separate apps:**

1. **App Store SEO (ASO).** A user searching "firefighter exam prep" will find "FirefighterPrep" before "ExamAudio - Professional Certification Study" every time. App name, subtitle, and keywords are the three strongest ASO signals. A niche-specific app name is a 10x advantage.

2. **User trust.** Tradespeople want the thing built for them, not a generic platform. "CDL Audio Prep" feels purpose-built. "ExamAudio" with a dropdown to pick your exam feels like a compromise.

3. **Ratings isolation.** If electricians hate version 2.3 and leave 1-star reviews, firefighters' 4.8-star rating is unaffected.

4. **Featured potential.** Apple and Google feature niche apps that serve specific communities. A "Firefighter Study" app is more likely to get featured in Education than a generic exam app.

5. **Push notification segmentation is native.** Each app has its own notification config. No multi-tenant notification routing complexity.

**Why NOT a single app with niche selection:**

- ASO is dramatically worse. You can't rank for "CDL exam" AND "electrician exam" AND "firefighter exam" with one app listing.
- Users who install a generic app and then have to "pick their exam" have a worse onboarding experience.
- One bad review from a CDL user tanks the app for all niches.
- App size bloats with content for every niche (even if lazy-loaded, the Store listing shows total size).

**The overhead concern is real but manageable.** EAS Build lets you build N apps from one codebase with different `app.json` configs. The build pipeline handles the multiplication. You're not maintaining separate codebases -- you're maintaining separate App Store listings, which is mostly copy/screenshots.

### White-Label Build System

Each brand is defined by a config file that drives the entire app appearance and content scope:

```
mobile/
  brands/
    firefighter/
      app.config.ts        # Expo config overrides (name, bundle ID, icons)
      brand.ts             # Runtime brand config (colors, copy, API scope)
      assets/
        icon.png           # 1024x1024 app icon
        splash.png         # Splash screen
        adaptive-icon.png  # Android adaptive icon
    cdl/
      app.config.ts
      brand.ts
      assets/
        ...
    electrician/
      ...
```

Brand config structure:

```typescript
// packages/shared/src/brand.ts
export interface BrandConfig {
  id: string;                    // "firefighter" | "cdl" | "electrician" | ...
  displayName: string;           // "FirefighterPrep"
  tagline: string;               // "Audio exam prep for firefighter candidates"
  bundleId: string;              // "com.firefighterprep.app"
  androidPackage: string;        // "com.firefighterprep.app"

  theme: {
    primary: string;             // "#FF4500"
    primaryForeground: string;   // "#FFFFFF"
    secondary: string;           // "#CC3700"
    background: string;          // "#FAFAFA"
    surface: string;             // "#FFFFFF"
    text: string;                // "#1A1A1A"
    textMuted: string;           // "#6B7280"
    accent: string;              // "#FF6B35"
  };

  content: {
    examNames: string[];         // ["Firefighter I", "Firefighter II", "Fire Inspector"]
    regulatoryBody: string;      // "NFPA"
    sourceDocuments: string[];   // ["NFPA 1001", "IFSTA Essentials"]
  };

  store: {
    appleTeamId: string;
    appStoreConnectId: string;   // filled after first submission
    playStoreTrack: string;      // "production" | "beta"
  };
}
```

The build command selects a brand:

```bash
# Build firefighter app for iOS
BRAND=firefighter eas build --platform ios --profile production

# Build CDL app for Android
BRAND=cdl eas build --platform android --profile production
```

`app.config.ts` at the root reads `process.env.BRAND` and merges the brand-specific overrides:

```typescript
// mobile/app.config.ts
import { ExpoConfig } from 'expo/config';
import { getBrandConfig } from './brands/resolve';

const brand = getBrandConfig(process.env.BRAND || 'firefighter');

const config: ExpoConfig = {
  name: brand.displayName,
  slug: brand.id,
  version: '1.0.0',
  orientation: 'portrait',
  icon: `./brands/${brand.id}/assets/icon.png`,
  splash: {
    image: `./brands/${brand.id}/assets/splash.png`,
    resizeMode: 'contain',
    backgroundColor: brand.theme.primary,
  },
  ios: {
    bundleIdentifier: brand.bundleId,
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: brand.androidPackage,
    adaptiveIcon: {
      foregroundImage: `./brands/${brand.id}/assets/adaptive-icon.png`,
      backgroundColor: brand.theme.primary,
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: `./brands/${brand.id}/assets/notification-icon.png`,
        color: brand.theme.primary,
      },
    ],
  ],
  extra: {
    brandId: brand.id,
    eas: { projectId: brand.easProjectId },
  },
};

export default config;
```

### Cost Per Brand

| Item | One-Time | Recurring |
|------|----------|-----------|
| Apple Developer Account | $99/year | $99/year |
| Google Play Developer Account | $25 | $0 |
| App Store screenshots (per device) | ~2 hours | ~30 min per update |
| EAS Build (free tier: 30 builds/mo) | $0 | $0 (or $99/mo for priority) |

At 5 brands: ~$520/year Apple + $125 Google = $645/year total. Manageable.

---

## 3. Project Structure

### Monorepo Layout

The mobile app lives alongside the web app in a monorepo. Shared code is extracted into packages.

```
niche-audio-prep/
├── apps/
│   ├── web/                          # Next.js web app (existing)
│   │   ├── src/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── mobile/                       # React Native (Expo) app
│       ├── app/                      # Expo Router file-based routes
│       │   ├── _layout.tsx           # Root layout (providers, theme)
│       │   ├── (tabs)/              # Tab navigator group
│       │   │   ├── _layout.tsx       # Tab bar config
│       │   │   ├── index.tsx         # Home / Study dashboard
│       │   │   ├── library.tsx       # Content library / downloads
│       │   │   ├── progress.tsx      # Stats & progress
│       │   │   └── settings.tsx      # Account, downloads, preferences
│       │   ├── player/
│       │   │   └── [sessionId].tsx   # Full-screen player
│       │   ├── exam/
│       │   │   ├── [examId].tsx      # Exam detail / section list
│       │   │   └── section/
│       │   │       └── [sectionId].tsx # Section detail / item list
│       │   └── auth/
│       │       ├── sign-in.tsx
│       │       └── sign-up.tsx
│       │
│       ├── components/               # Mobile-specific components
│       │   ├── MiniPlayer.tsx        # Persistent bottom player bar
│       │   ├── FullPlayer.tsx        # Expanded player screen
│       │   ├── DownloadButton.tsx    # Download indicator + trigger
│       │   ├── StudyModeSelector.tsx # Sequential / Shuffle / SRS picker
│       │   ├── SleepTimerSheet.tsx   # Bottom sheet for sleep timer
│       │   ├── SpeedControl.tsx      # Playback speed selector
│       │   └── ProgressRing.tsx      # Circular progress indicator
│       │
│       ├── hooks/                    # Mobile-specific hooks
│       │   ├── useTrackPlayer.ts     # Wraps react-native-track-player
│       │   ├── useDownloadManager.ts # Manages content downloads
│       │   ├── useStudySession.ts    # Orchestrates a study session
│       │   └── useSleepTimer.ts      # Sleep timer logic
│       │
│       ├── services/                 # Native service wrappers
│       │   ├── track-player.ts       # RNTP setup + playback service
│       │   ├── notifications.ts      # Push notification handlers
│       │   └── background-sync.ts    # Background task for progress sync
│       │
│       ├── brands/                   # Per-brand configs + assets
│       │   ├── resolve.ts            # Reads BRAND env, exports config
│       │   ├── firefighter/
│       │   ├── cdl/
│       │   └── electrician/
│       │
│       ├── stores/                   # Zustand stores (mobile-specific)
│       │   ├── player-store.ts       # Current playback state
│       │   └── download-store.ts     # Download queue + progress
│       │
│       ├── db/                       # WatermelonDB setup
│       │   ├── schema.ts             # Table definitions
│       │   ├── models/               # WatermelonDB model classes
│       │   │   ├── StudyItem.ts
│       │   │   ├── StudyProgress.ts
│       │   │   ├── DownloadedAudio.ts
│       │   │   └── Bookmark.ts
│       │   ├── migrations.ts         # Schema migrations
│       │   └── sync.ts              # Sync adapter (push/pull with API)
│       │
│       ├── app.config.ts            # Dynamic Expo config (reads brand)
│       ├── eas.json                 # EAS Build profiles
│       ├── metro.config.js          # Metro bundler config (monorepo)
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                      # Code shared between web + mobile
│   │   ├── src/
│   │   │   ├── types/               # TypeScript interfaces
│   │   │   │   ├── study-item.ts    # StudyItem, StudySection, Exam
│   │   │   │   ├── progress.ts      # StudyProgress, StreakData
│   │   │   │   ├── user.ts          # User, Subscription
│   │   │   │   └── brand.ts         # BrandConfig
│   │   │   ├── api/                 # API client (fetch-based)
│   │   │   │   ├── client.ts        # Base HTTP client
│   │   │   │   ├── auth.ts          # Auth endpoints
│   │   │   │   ├── content.ts       # Content/catalog endpoints
│   │   │   │   ├── progress.ts      # Progress sync endpoints
│   │   │   │   └── subscriptions.ts # Subscription endpoints
│   │   │   ├── study/               # Study logic (pure functions)
│   │   │   │   ├── spaced-repetition.ts  # SM-2 algorithm
│   │   │   │   ├── shuffle.ts            # Fisher-Yates shuffle
│   │   │   │   ├── session-builder.ts    # Build study session from items
│   │   │   │   └── streak.ts             # Streak calculation
│   │   │   ├── constants.ts         # Shared constants
│   │   │   └── index.ts             # Barrel export
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ui/                          # Shared UI primitives (future)
│       └── ...                      # React Native + React Native Web
│
├── turbo.json                       # Turborepo pipeline config
├── package.json                     # Root workspace config
└── tsconfig.base.json              # Shared TS config
```

### Why This Structure

1. **`packages/shared`** contains zero React code. It's pure TypeScript: types, API clients, algorithms, constants. It works identically in Next.js server components, Next.js client components, and React Native. No platform-specific imports.

2. **`apps/mobile/hooks`** contains platform-specific hooks that wrap native APIs (`react-native-track-player`, `expo-file-system`, WatermelonDB). These have the same *interface patterns* as the web hooks (the try-listening prototype's `useAudioPlayer` returns `{ state, play, pause, seek, ... }`) but completely different implementations.

3. **`apps/mobile/brands`** mirrors the web's brand config approach. Same `BrandConfig` type from `packages/shared`, different resolution mechanism (env var at build time vs. hostname at runtime).

4. **Expo Router's file-based routing** means the mobile route structure (`app/(tabs)/library.tsx`) maps conceptually to the web's route structure (`app/library/page.tsx`). A developer working on either platform knows where to find things.

---

## 4. Audio Engine Architecture

### Overview

The try-listening prototype uses a chunk-based `HTMLAudioElement` approach: text is split into chunks, each chunk is TTS-generated on demand, cached in IndexedDB, and played sequentially via a single `<audio>` element. This works for web but won't work for mobile because:

1. `HTMLAudioElement` doesn't exist in React Native
2. Background audio requires OS-level integration (MPRemoteCommandCenter on iOS, MediaSession on Android)
3. Mobile audio must survive app suspension, process death, and memory pressure
4. Users expect lock screen controls, car display integration, and notification player

`react-native-track-player` (RNTP) solves all of this. It runs a foreground service (Android) / audio session (iOS) that persists independently of the React Native JavaScript thread.

### Key Design: Study Session as a Playlist

A study session becomes a RNTP queue (playlist). Each study item = one track. The queue is populated from the study session builder (shared logic in `packages/shared/src/study/session-builder.ts`) and RNTP handles sequential playback, gapless transitions, and background persistence.

```
Study Session: "NFPA 1001 - Chapter 3: Fire Behavior"
  ├── Track 1: "Q: What are the three elements of the fire triangle?"
  │            "A: Heat, fuel, and oxygen (oxidizing agent)."
  ├── Track 2: "Q: Define flashover."
  │            "A: The near-simultaneous ignition of all..."
  ├── Track 3: ...
  └── Track N: ...
```

### Audio File Strategy

Unlike the web prototype (which streams TTS chunks on demand), mobile needs downloadable audio files. The flow:

1. **Server pre-generates audio** for each study item (question + answer as one MP3/AAC file)
2. **Mobile downloads files** to device storage via `expo-file-system`
3. **RNTP plays from local file paths** (no streaming required for offline support)
4. **Fallback: stream from CDN** if not downloaded (for online-only use)

This is a deliberate departure from the web's chunk-based approach. On mobile, pre-generated audio files are superior because:
- RNTP expects complete audio files (URL or local path), not in-memory chunks
- Download progress is meaningful (user sees "Downloaded 45 of 120 items")
- File-based storage integrates with iOS/Android storage management
- No TTS latency during playback

### Track Player Service

```typescript
// apps/mobile/services/track-player.ts
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';

export async function setupPlayer(): Promise<boolean> {
  let isSetup = false;
  try {
    await TrackPlayer.getActiveTrack();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer({
      // Buffer config for gapless playback
      minBuffer: 15,    // seconds
      maxBuffer: 50,
      playBuffer: 2,
      backBuffer: 15,
    });
    isSetup = true;
  }

  if (isSetup) {
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.SetRating,      // for bookmarking from lock screen
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 1, // seconds
    });
  }

  return isSetup;
}

// Playback service -- runs even when JS thread is suspended
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  // Track ended -- update study progress
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    if (event.lastTrack) {
      // Fire progress update to Zustand store
      // The store handles writing to WatermelonDB + queueing sync
    }
  });

  // Handle audio ducking (lower volume for notifications/calls)
  TrackPlayer.addEventListener(Event.RemoteDuck, (event) => {
    if (event.paused) {
      TrackPlayer.pause();
    } else if (event.permanent) {
      TrackPlayer.stop();
    } else {
      TrackPlayer.setVolume(event.ducking ? 0.3 : 1.0);
    }
  });
}
```

### useTrackPlayer Hook

This is the mobile equivalent of the web's `useAudioPlayer`. Same concept, completely different implementation.

```typescript
// apps/mobile/hooks/useTrackPlayer.ts
import { useCallback, useEffect } from 'react';
import TrackPlayer, {
  Track,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';
import { usePlayerStore } from '../stores/player-store';
import type { StudyItem } from '@niche-audio-prep/shared';

export function useTrackPlayer() {
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const activeTrack = useActiveTrack();
  const store = usePlayerStore();

  const loadSession = useCallback(async (items: StudyItem[], startIndex = 0) => {
    await TrackPlayer.reset();

    const tracks: Track[] = items.map((item, index) => ({
      id: item.id,
      url: item.localAudioPath || item.remoteAudioUrl,
      title: item.questionPreview,     // truncated question text
      artist: item.sectionName,        // "NFPA 1001 - Chapter 3"
      artwork: item.brandIcon,         // brand icon for lock screen
      duration: item.audioDurationSec,
      // Custom data for our use
      headers: {},
      // Store item metadata for progress tracking
    }));

    await TrackPlayer.add(tracks);

    if (startIndex > 0) {
      await TrackPlayer.skip(startIndex);
    }

    store.setSession(items, startIndex);
  }, [store]);

  const play = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === 'playing') {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, []);

  const skipNext = useCallback(async () => {
    await TrackPlayer.skipToNext();
  }, []);

  const skipPrevious = useCallback(async () => {
    await TrackPlayer.skipToPrevious();
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await TrackPlayer.seekTo(seconds);
  }, []);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    await TrackPlayer.setRate(speed);
    store.setPlaybackSpeed(speed);
  }, [store]);

  const setRepeatMode = useCallback(async (mode: 'off' | 'queue' | 'track') => {
    const modeMap = { off: 0, queue: 2, track: 1 };
    await TrackPlayer.setRepeatMode(modeMap[mode]);
  }, []);

  return {
    // State (reactive, from RNTP hooks)
    isPlaying: playbackState.state === 'playing',
    isBuffering: playbackState.state === 'buffering',
    isLoading: playbackState.state === 'loading',
    position: progress.position,
    duration: progress.duration,
    buffered: progress.buffered,
    activeTrack,
    activeTrackIndex: store.currentIndex,
    totalTracks: store.sessionItems.length,

    // Actions
    loadSession,
    play,
    pause,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
    setPlaybackSpeed,
    setRepeatMode,
  };
}
```

### Sleep Timer

```typescript
// apps/mobile/hooks/useSleepTimer.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import TrackPlayer, { Event } from 'react-native-track-player';

type SleepMode =
  | { type: 'off' }
  | { type: 'minutes'; minutes: number }
  | { type: 'items'; count: number };

export function useSleepTimer() {
  const [mode, setMode] = useState<SleepMode>({ type: 'off' });
  const [remainingMs, setRemainingMs] = useState(0);
  const [remainingItems, setRemainingItems] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Time-based sleep timer
  useEffect(() => {
    if (mode.type !== 'minutes') return;

    const endTime = Date.now() + mode.minutes * 60 * 1000;
    setRemainingMs(mode.minutes * 60 * 1000);

    timerRef.current = setInterval(async () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        await TrackPlayer.pause();
        setMode({ type: 'off' });
        setRemainingMs(0);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  // Item-based sleep timer (stop after N more items)
  useEffect(() => {
    if (mode.type !== 'items') return;

    setRemainingItems(mode.count);
    let itemsPlayed = 0;

    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async () => {
        itemsPlayed++;
        const left = mode.count - itemsPlayed;
        setRemainingItems(left);
        if (left <= 0) {
          await TrackPlayer.pause();
          setMode({ type: 'off' });
        }
      }
    );

    return () => subscription.remove();
  }, [mode]);

  const setSleepTimer = useCallback((newMode: SleepMode) => {
    setMode(newMode);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    setMode({ type: 'off' });
    setRemainingMs(0);
    setRemainingItems(0);
  }, []);

  return {
    mode,
    remainingMs,
    remainingItems,
    setSleepTimer,
    cancelSleepTimer,
    isActive: mode.type !== 'off',
  };
}
```

### Playback Speed Control

RNTP supports `setRate()` natively. Speeds from 0.5x to 3.0x. The web prototype supports `[0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]` -- we keep the same set. The speed preference persists in Zustand (written to AsyncStorage) and syncs to the backend as a user preference.

### Audio Focus / Interruption Handling

RNTP handles most of this automatically through the `RemoteDuck` event (shown in the PlaybackService above). Key behaviors:

| Interruption | Behavior |
|-------------|----------|
| Phone call | Pause. Resume when call ends. |
| Notification sound | Duck volume to 30% briefly, restore. |
| Another audio app starts | Pause. User must manually resume. |
| Bluetooth disconnects | Pause. |
| Headphones unplugged | Pause (iOS does this at OS level). |
| Siri / Google Assistant | Pause. Resume when dismissed. |

### CarPlay / Android Auto

RNTP provides lock screen controls that work with CarPlay and Android Auto by default. The notification player metadata (title, artist, artwork) displays on car screens. Steering wheel next/previous buttons trigger `RemoteNext`/`RemotePrevious` events. No additional code required.

For deeper CarPlay integration (dedicated CarPlay UI with browse categories), that's a v2 feature. The lock screen integration is sufficient for launch.

---

## 5. Offline Sync Architecture

### Overview

The try-listening prototype uses IndexedDB (`idb-audio-store.ts`) to cache audio chunks on the web. The mobile equivalent needs to handle:

1. **Audio file downloads** -- actual MP3/AAC files stored on the filesystem
2. **Study data** -- items, progress, bookmarks stored in a local database
3. **Sync** -- bidirectional sync of progress data when connectivity returns

### Storage Layer: WatermelonDB + expo-file-system

**WatermelonDB for structured data** (study items, progress, bookmarks):
- SQLite under the hood, but with lazy loading -- only loads records when accessed
- Built-in sync protocol: defines a `pullChanges` / `pushChanges` contract that maps directly to a REST API
- Handles conflict resolution (server wins for content, last-write-wins for progress)
- Observable queries -- UI re-renders when data changes, no manual polling

**expo-file-system for audio files** (binary blobs):
- Downloads to `FileSystem.documentDirectory` (persists across app restarts, included in backups)
- Background download support via `FileSystem.createDownloadResumable`
- Storage stats via `FileSystem.getInfoAsync`

### Database Schema

```typescript
// apps/mobile/db/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Study content
    tableSchema({
      name: 'exams',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'section_count', type: 'number' },
        { name: 'item_count', type: 'number' },
        { name: 'brand_id', type: 'string', isIndexed: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sections',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'sort_order', type: 'number' },
        { name: 'item_count', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'study_items',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'section_id', type: 'string', isIndexed: true },
        { name: 'question_text', type: 'string' },
        { name: 'answer_text', type: 'string' },
        { name: 'explanation_text', type: 'string', isOptional: true },
        { name: 'audio_duration_sec', type: 'number' },
        { name: 'remote_audio_url', type: 'string' },
        { name: 'local_audio_path', type: 'string', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // User progress
    tableSchema({
      name: 'study_progress',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'study_item_id', type: 'string', isIndexed: true },
        { name: 'times_studied', type: 'number' },
        { name: 'last_studied_at', type: 'number', isOptional: true },
        { name: 'ease_factor', type: 'number' },       // SM-2 ease factor
        { name: 'interval_days', type: 'number' },     // SM-2 interval
        { name: 'next_review_at', type: 'number', isOptional: true },
        { name: 'is_bookmarked', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Download tracking
    tableSchema({
      name: 'downloads',
      columns: [
        { name: 'section_id', type: 'string', isIndexed: true },
        { name: 'total_items', type: 'number' },
        { name: 'downloaded_items', type: 'number' },
        { name: 'total_bytes', type: 'number' },
        { name: 'status', type: 'string' },  // 'pending' | 'downloading' | 'complete' | 'error'
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Study sessions (for streak tracking)
    tableSchema({
      name: 'study_sessions',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'items_studied', type: 'number' },
        { name: 'duration_sec', type: 'number' },
        { name: 'mode', type: 'string' },  // 'sequential' | 'shuffle' | 'spaced_repetition'
        { name: 'started_at', type: 'number' },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

### Sync Strategy

WatermelonDB's sync protocol is a clean two-phase operation:

1. **Pull**: GET `/api/sync/pull?last_pulled_at=<timestamp>` -- server returns all records created/updated/deleted since that timestamp
2. **Push**: POST `/api/sync/push` -- client sends all locally-created/updated/deleted records

```typescript
// apps/mobile/db/sync.ts
import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { apiClient } from '@niche-audio-prep/shared';

export async function syncDatabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const response = await apiClient.get('/api/sync/pull', {
        params: {
          last_pulled_at: lastPulledAt,
          schema_version: schemaVersion,
          migration: migration ? JSON.stringify(migration) : null,
        },
      });

      if (!response.ok) {
        throw new Error(`Sync pull failed: ${response.status}`);
      }

      const { changes, timestamp } = await response.json();
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const response = await apiClient.post('/api/sync/push', {
        body: { changes, lastPulledAt },
      });

      if (!response.ok) {
        throw new Error(`Sync push failed: ${response.status}`);
      }
    },
    // Conflict resolution: server content wins, client progress wins
    // (WatermelonDB handles this via the push/pull protocol)
    migrationsEnabledAtVersion: 1,
  });
}
```

### Sync Triggers

| Trigger | Action |
|---------|--------|
| App foreground (from background) | Pull changes, then push local changes |
| Study session ends | Push progress immediately |
| Every 5 minutes while app is open | Background sync |
| Network reconnects (NetInfo) | Full sync |
| Manual pull-to-refresh | Full sync |
| Background fetch (OS-scheduled) | Push pending progress |

### Download Manager

```typescript
// apps/mobile/hooks/useDownloadManager.ts
import { useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import { useDownloadStore } from '../stores/download-store';

const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;
const MAX_CONCURRENT_DOWNLOADS = 3;

export function useDownloadManager() {
  const store = useDownloadStore();

  // Ensure audio directory exists
  useEffect(() => {
    FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true }).catch(() => {});
  }, []);

  const downloadSection = useCallback(async (sectionId: string) => {
    const items = await database
      .get('study_items')
      .query(Q.where('section_id', sectionId))
      .fetch();

    store.startDownload(sectionId, items.length);

    // Download items with concurrency limit
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < items.length) {
        const item = items[nextIndex++];
        if (!item) continue;

        // Skip if already downloaded
        if (item.localAudioPath) {
          const info = await FileSystem.getInfoAsync(item.localAudioPath);
          if (info.exists) {
            store.incrementProgress(sectionId);
            continue;
          }
        }

        try {
          const localPath = `${AUDIO_DIR}${item.serverId}.mp3`;
          const download = FileSystem.createDownloadResumable(
            item.remoteAudioUrl,
            localPath,
            {},
            (progress) => {
              // Optional: per-file progress tracking
            }
          );

          const result = await download.downloadAsync();
          if (result) {
            // Update WatermelonDB record with local path
            await database.write(async () => {
              await item.update((record: any) => {
                record.localAudioPath = localPath;
              });
            });
            store.incrementProgress(sectionId);
          }
        } catch (error) {
          console.error(`Download failed for ${item.serverId}:`, error);
          // Continue with next item, don't fail the whole section
        }
      }
    }

    const workerCount = Math.min(MAX_CONCURRENT_DOWNLOADS, items.length);
    await Promise.allSettled(
      Array.from({ length: workerCount }, () => worker())
    );

    store.completeDownload(sectionId);
  }, [store]);

  const deleteSection = useCallback(async (sectionId: string) => {
    const items = await database
      .get('study_items')
      .query(Q.where('section_id', sectionId))
      .fetch();

    await database.write(async () => {
      for (const item of items) {
        if (item.localAudioPath) {
          await FileSystem.deleteAsync(item.localAudioPath, { idempotent: true });
          await item.update((record: any) => {
            record.localAudioPath = null;
          });
        }
      }
    });

    store.removeDownload(sectionId);
  }, [store]);

  const getStorageUsage = useCallback(async (): Promise<{
    usedBytes: number;
    formattedSize: string;
  }> => {
    const info = await FileSystem.getInfoAsync(AUDIO_DIR);
    const usedBytes = (info as any).size || 0;
    const mb = usedBytes / (1024 * 1024);
    return {
      usedBytes,
      formattedSize: mb < 1 ? `${Math.round(mb * 1024)} KB` : `${mb.toFixed(1)} MB`,
    };
  }, []);

  return {
    downloadSection,
    deleteSection,
    getStorageUsage,
    downloads: store.downloads,
    isDownloading: store.isDownloading,
  };
}
```

### Storage Management UI

The Settings screen shows:
- Total storage used by audio files
- Per-section breakdown (e.g., "NFPA 1001 Ch.3: 45 MB, 120 items")
- "Delete" button per section to reclaim space
- "Download All" button per exam
- Device storage remaining (via `expo-file-system`)

---

## 6. Push Notification System

### Notification Types

| Type | Trigger | Content Example |
|------|---------|-----------------|
| **Study reminder** | Scheduled local notification | "Time to study! You're on a 5-day streak." |
| **Streak at risk** | 8pm local if no study today | "Don't lose your 12-day streak! Study 5 minutes to keep it going." |
| **New content** | Server push when new sections added | "New content: NFPA 1001 Chapter 7 is now available." |
| **Download complete** | Local, after background download finishes | "NFPA 1001 - Fire Behavior downloaded. Ready for offline study." |
| **Weekly progress** | Scheduled local, Sunday evening | "This week: 45 items studied, 3 hours total. Keep it up!" |

### Implementation

```typescript
// apps/mobile/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Request permissions on first launch
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Register for push notifications (server-sent)
export async function registerForPushNotifications(): Promise<string | null> {
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });
  return token.data;
  // Send this token to the backend: POST /api/devices { pushToken, platform }
}

// Schedule daily study reminder
export async function scheduleStudyReminder(hour: number, minute: number) {
  // Cancel existing study reminders first
  await cancelStudyReminders();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to study',
      body: 'A few minutes of audio review keeps the knowledge fresh.',
      sound: true,
      categoryIdentifier: 'study-reminder',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// Schedule streak-at-risk notification (8pm if no study today)
export async function scheduleStreakReminder(currentStreak: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Don't break your ${currentStreak}-day streak!`,
      body: 'Study for just 5 minutes to keep your streak alive.',
      sound: true,
      categoryIdentifier: 'streak-reminder',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

async function cancelStudyReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (
      notification.content.categoryIdentifier === 'study-reminder' ||
      notification.content.categoryIdentifier === 'streak-reminder'
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Handle notification taps (deep link to player or content)
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}
```

### Notification Preferences

Users configure in Settings:
- **Study reminder time**: Picker for hour/minute (default: 9:00 AM)
- **Streak reminders**: Toggle on/off (default: on)
- **New content alerts**: Toggle on/off (default: on)
- **Weekly summary**: Toggle on/off (default: on)

These preferences sync to the backend so server-sent push notifications respect them.

---

## 7. Component Sharing Strategy with Web

### What's Shared (packages/shared)

Everything in `packages/shared` is **pure TypeScript with zero React or platform imports**. It runs identically in Node.js, browser, and React Native.

| Module | Contents | Used By |
|--------|----------|---------|
| `types/` | All TypeScript interfaces and type definitions | Web + Mobile + Backend |
| `api/client.ts` | Fetch-based HTTP client with auth headers, error handling | Web + Mobile |
| `api/auth.ts` | Login, signup, token refresh endpoint wrappers | Web + Mobile |
| `api/content.ts` | Fetch exams, sections, items | Web + Mobile |
| `api/progress.ts` | Sync progress, get streaks | Web + Mobile |
| `study/spaced-repetition.ts` | SM-2 algorithm (pure math, no side effects) | Web + Mobile |
| `study/shuffle.ts` | Fisher-Yates shuffle for random mode | Web + Mobile |
| `study/session-builder.ts` | Given items + mode, produce ordered study list | Web + Mobile |
| `study/streak.ts` | Calculate streak from session history | Web + Mobile |
| `constants.ts` | Speed values, skip duration, limits | Web + Mobile |

### What's NOT Shared (Platform-Specific)

| Concern | Web Implementation | Mobile Implementation | Why Different |
|---------|-------------------|----------------------|---------------|
| **Audio playback** | `useAudioPlayer` (HTMLAudioElement + blob URLs) | `useTrackPlayer` (react-native-track-player) | Fundamentally different APIs. Web uses in-memory blobs; mobile uses filesystem + native audio service. |
| **Offline storage** | `useOfflineAudio` (IndexedDB via idb-audio-store) | `useDownloadManager` (expo-file-system + WatermelonDB) | IndexedDB doesn't exist in RN. Mobile needs filesystem storage for audio + SQLite for metadata. |
| **Media session** | `useMediaSession` (navigator.mediaSession) | RNTP handles this natively | Web Media Session API vs. native MPRemoteCommandCenter / MediaSession. |
| **Playback persistence** | `usePlaybackPersistence` (fetch with keepalive) | Zustand + MMKV (persisted store) | Web saves to server on page unload; mobile persists locally + syncs later. |
| **Navigation** | Next.js App Router | Expo Router | Same file-based concept, different runtime. |
| **Styling** | Tailwind CSS + shadcn/ui | NativeWind + custom components | CSS doesn't exist in RN. NativeWind compiles Tailwind classes to RN styles. |
| **Notifications** | Not applicable (web push is a future feature) | expo-notifications | Native-only feature. |
| **Background tasks** | Not applicable | expo-background-fetch | Native-only feature. |

### Shared Interface Pattern

Even though implementations differ, the hooks expose similar interfaces. This means a developer who understands the web player hook can immediately work on the mobile player hook.

```typescript
// Web: useAudioPlayer returns
{
  state: { isPlaying, isLoading, currentTime, duration, playbackRate, ... },
  play, pause, togglePlayPause, seek, setSpeed, skipForward, skipBackward, ...
}

// Mobile: useTrackPlayer returns
{
  isPlaying, isLoading, position, duration, playbackSpeed,
  play, pause, togglePlayPause, seekTo, setPlaybackSpeed, skipNext, skipPrevious, ...
}
```

The shapes are intentionally similar. A `PlayerControls` component on either platform receives the same kind of props.

### Future: Shared UI Components

Once both platforms stabilize, consider extracting truly shared UI components to `packages/ui` using React Native for Web. Components like `ProgressRing`, `SpeedButton`, and `StudyModeSelector` could potentially render on both platforms. But this is a v2 optimization. At launch, maintain separate UI components -- the effort to make cross-platform UI components pixel-perfect on both web and mobile is not worth it when you have fewer than 5 shared components.

---

## 8. App Store Deployment Pipeline

### EAS Build Profiles

```json
// apps/mobile/eas.json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "env": {
        "BRAND": "firefighter"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Release"
      },
      "env": {
        "APP_VARIANT": "preview"
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "autoIncrement": true
      },
      "android": {
        "buildType": "app-bundle",
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "will@nicheaudioprep.com",
        "ascAppId": "FROM_BRAND_CONFIG",
        "appleTeamId": "FROM_BRAND_CONFIG"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### Build Script

```bash
#!/bin/bash
# scripts/build-brand.sh
# Usage: ./scripts/build-brand.sh firefighter ios production

BRAND=$1
PLATFORM=$2
PROFILE=$3

echo "Building ${BRAND} for ${PLATFORM} (${PROFILE})"

cd apps/mobile

BRAND=$BRAND eas build \
  --platform $PLATFORM \
  --profile $PROFILE \
  --non-interactive
```

### Release Workflow

```
Feature branch
  → PR to main
  → CI: lint + type-check + test (all packages)
  → Merge to main
  → Manual trigger: "Release mobile v1.2.3"
    → For each brand in [firefighter, cdl, electrician]:
      → EAS Build (iOS + Android)
      → EAS Submit to TestFlight / Google Play Internal Testing
      → Manual QA on physical devices
      → Promote to production
```

### App Store Considerations

**iOS App Review:**
- Subscription apps must use StoreKit for in-app purchases (Apple takes 15-30%)
- Content must be in the app or downloadable from within the app (no "buy on our website" CTAs)
- Audio background mode must be declared in `Info.plist` (`UIBackgroundModes: ['audio']`)
- Account deletion must be available in the app (App Store Review Guideline 5.1.1)

**Google Play:**
- Subscription billing can use Google Play Billing or a web redirect (Google allows web billing for media apps in some cases -- verify current policy)
- Background audio requires a foreground service notification (RNTP handles this)
- Target API level must be current (API 34+ as of 2026)

### Billing Strategy

**Recommended: Web-only billing initially.** Users subscribe on the website (Stripe). The mobile app checks subscription status via the API. This avoids the 15-30% App Store/Play Store commission.

**How this works legally:**
- The app is a "reader" app (like Netflix, Spotify, Kindle) -- users consume content they've already purchased
- You cannot link to or mention the website for purchasing within the app (Apple's anti-steering rules, though these are loosening post-Epic)
- The app provides value without a subscription (free tier with limited content) and the subscription unlocks full access
- Users who discover the app can subscribe on the web separately

**If Apple rejects this:** Fall back to offering StoreKit in-app purchases alongside web billing. Use RevenueCat to manage cross-platform subscription status (it handles StoreKit + Google Play Billing + Stripe in a unified API).

**RevenuCat (recommended for v2 or if required by Apple):**
- Single source of truth for subscription status across web + iOS + Android
- Handles receipt validation, grace periods, refunds
- $0 until $2,500 MTR (monthly tracked revenue), then 1%

---

## 9. Task Breakdown

### Phase 0: Monorepo Setup (Week 1)

#### Task 0.1: Initialize Turborepo Monorepo

**Files:**
- Create: `turbo.json`
- Create: `package.json` (root workspace)
- Create: `tsconfig.base.json`
- Modify: move existing web app to `apps/web/`

**Step 1:** Initialize root workspace with Turborepo. Configure workspace packages (`apps/*`, `packages/*`).

**Step 2:** Move existing Next.js app into `apps/web/`. Update all import paths. Verify `bun dev` still works from `apps/web/`.

**Step 3:** Verify the existing web app builds and runs from the monorepo root via `turbo dev --filter=web`.

**Step 4:** Commit.

#### Task 0.2: Create packages/shared

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/study-item.ts`
- Create: `packages/shared/src/types/progress.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/brand.ts`
- Create: `packages/shared/src/constants.ts`

**Step 1:** Create the `packages/shared` directory with TypeScript config extending `tsconfig.base.json`.

**Step 2:** Define core TypeScript interfaces: `StudyItem`, `StudySection`, `Exam`, `StudyProgress`, `BrandConfig`, `User`, `Subscription`.

**Step 3:** Extract shared constants from the web app (speed values, skip duration) into `packages/shared/src/constants.ts`.

**Step 4:** Add `@niche-audio-prep/shared` as a dependency in `apps/web/package.json`. Verify web app still builds.

**Step 5:** Commit.

#### Task 0.3: Create Shared API Client

**Files:**
- Create: `packages/shared/src/api/client.ts`
- Create: `packages/shared/src/api/auth.ts`
- Create: `packages/shared/src/api/content.ts`
- Create: `packages/shared/src/api/progress.ts`

**Step 1:** Write a base HTTP client wrapper around `fetch` that handles auth token injection, error parsing, and base URL configuration.

**Step 2:** Write endpoint wrappers for auth (login, signup, refresh), content (list exams, get sections, get items), and progress (sync progress, get streaks).

**Step 3:** Write unit tests for the API client (mock fetch, verify request construction and error handling).

**Step 4:** Commit.

#### Task 0.4: Create Shared Study Logic

**Files:**
- Create: `packages/shared/src/study/spaced-repetition.ts`
- Create: `packages/shared/src/study/spaced-repetition.test.ts`
- Create: `packages/shared/src/study/shuffle.ts`
- Create: `packages/shared/src/study/shuffle.test.ts`
- Create: `packages/shared/src/study/session-builder.ts`
- Create: `packages/shared/src/study/session-builder.test.ts`
- Create: `packages/shared/src/study/streak.ts`
- Create: `packages/shared/src/study/streak.test.ts`

**Step 1:** Implement SM-2 spaced repetition algorithm. Write tests: verify ease factor calculation, interval progression, and edge cases (first review, failed review, perfect score).

**Step 2:** Implement Fisher-Yates shuffle. Write test: verify shuffled array has same elements, verify it doesn't always return the same order (probabilistic).

**Step 3:** Implement session builder: given a list of items + study mode (sequential/shuffle/spaced_repetition), return an ordered list. Write tests for each mode.

**Step 4:** Implement streak calculation: given a list of session timestamps, calculate current streak and longest streak. Write tests: consecutive days, gap days, timezone edge cases.

**Step 5:** Commit.

### Phase 1: Expo App Scaffold (Week 1-2)

#### Task 1.1: Initialize Expo App

**Files:**
- Create: `apps/mobile/` (Expo project)
- Create: `apps/mobile/app.config.ts`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/package.json`

**Step 1:** Run `npx create-expo-app apps/mobile --template blank-typescript` from the monorepo root.

**Step 2:** Configure `metro.config.js` to resolve packages from the monorepo root (required for monorepo + Expo).

**Step 3:** Add `@niche-audio-prep/shared` as a dependency. Verify you can import types from it.

**Step 4:** Configure `app.config.ts` with dynamic brand loading (reads `BRAND` env var, defaults to `firefighter`).

**Step 5:** Run `npx expo start` and verify the app loads in iOS Simulator / Android Emulator.

**Step 6:** Commit.

#### Task 1.2: Set Up Expo Router Navigation

**Files:**
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/library.tsx`
- Create: `apps/mobile/app/(tabs)/progress.tsx`
- Create: `apps/mobile/app/(tabs)/settings.tsx`

**Step 1:** Install `expo-router` and configure in `app.config.ts`.

**Step 2:** Create root layout with safe area provider and brand theme context.

**Step 3:** Create tab navigator with four tabs: Home, Library, Progress, Settings. Use placeholder content for each.

**Step 4:** Verify navigation works on both iOS and Android.

**Step 5:** Commit.

#### Task 1.3: Set Up NativeWind (Tailwind for RN)

**Files:**
- Create: `apps/mobile/tailwind.config.ts`
- Create: `apps/mobile/global.css`
- Modify: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1:** Install NativeWind v4 and configure Metro + Tailwind.

**Step 2:** Set up brand-specific CSS variables (mapping `BrandConfig.theme` to CSS custom properties).

**Step 3:** Style the tab bar using NativeWind classes. Verify colors match the brand config.

**Step 4:** Commit.

#### Task 1.4: Set Up First Brand Config

**Files:**
- Create: `apps/mobile/brands/resolve.ts`
- Create: `apps/mobile/brands/firefighter/brand.ts`
- Create: `apps/mobile/brands/firefighter/assets/icon.png`
- Create: `apps/mobile/brands/firefighter/assets/splash.png`
- Create: `apps/mobile/brands/firefighter/assets/adaptive-icon.png`

**Step 1:** Create the brand resolution function that reads `process.env.BRAND` and returns the matching `BrandConfig`.

**Step 2:** Create the firefighter brand config with theme colors, display name, and asset paths.

**Step 3:** Create placeholder app icon and splash screen for firefighter brand.

**Step 4:** Verify `app.config.ts` correctly picks up the firefighter brand config.

**Step 5:** Commit.

### Phase 2: Audio Engine (Week 2-3)

#### Task 2.1: Integrate react-native-track-player

**Files:**
- Create: `apps/mobile/services/track-player.ts`
- Modify: `apps/mobile/app/_layout.tsx` (initialize player)
- Modify: `apps/mobile/app.config.ts` (add background audio plugin)

**Step 1:** Install `react-native-track-player`. Add iOS background audio mode to `app.config.ts` (`UIBackgroundModes: ['audio']`).

**Step 2:** Write the `setupPlayer()` function and `PlaybackService` (as shown in Section 4).

**Step 3:** Register the playback service in the root layout. Verify the player initializes without errors.

**Step 4:** Test: manually add a track (hardcoded URL to a public MP3), play it, verify lock screen controls appear.

**Step 5:** Commit.

#### Task 2.2: Build useTrackPlayer Hook

**Files:**
- Create: `apps/mobile/hooks/useTrackPlayer.ts`
- Create: `apps/mobile/stores/player-store.ts`

**Step 1:** Create Zustand store for player state (current session items, current index, playback speed preference).

**Step 2:** Implement the `useTrackPlayer` hook (as shown in Section 4) wrapping RNTP's React hooks.

**Step 3:** Test: load a session of 3 hardcoded tracks, play/pause, skip next/previous, seek.

**Step 4:** Commit.

#### Task 2.3: Build Mini Player Component

**Files:**
- Create: `apps/mobile/components/MiniPlayer.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (add MiniPlayer above tab bar)

**Step 1:** Build the MiniPlayer: shows track title, play/pause button, progress bar. Positioned above the tab bar, visible on all tabs.

**Step 2:** Wire MiniPlayer to `useTrackPlayer` hook.

**Step 3:** Test: verify MiniPlayer appears when audio is loaded, disappears when no audio is active.

**Step 4:** Commit.

#### Task 2.4: Build Full Player Screen

**Files:**
- Create: `apps/mobile/app/player/[sessionId].tsx`
- Create: `apps/mobile/components/FullPlayer.tsx`
- Create: `apps/mobile/components/SpeedControl.tsx`

**Step 1:** Build the full-screen player: artwork area, track title, section name, scrubber/seek bar, play/pause, skip forward/backward, speed control, bookmark button.

**Step 2:** Make MiniPlayer tappable -- navigates to the full player screen.

**Step 3:** Add speed control component (cycle through 0.75x to 3x, matching web's speed set).

**Step 4:** Test: full player opens from MiniPlayer, all controls work, scrubber seeks accurately.

**Step 5:** Commit.

#### Task 2.5: Sleep Timer

**Files:**
- Create: `apps/mobile/hooks/useSleepTimer.ts`
- Create: `apps/mobile/components/SleepTimerSheet.tsx`

**Step 1:** Implement `useSleepTimer` hook (as shown in Section 4).

**Step 2:** Build bottom sheet UI with options: Off, 5 min, 15 min, 30 min, 1 hour, End of current item, 3 more items, 5 more items.

**Step 3:** Add sleep timer button to FullPlayer. Show remaining time/items when active.

**Step 4:** Test: set 1-minute timer, verify audio pauses after 1 minute. Set 2-items timer, verify pauses after 2 tracks.

**Step 5:** Commit.

#### Task 2.6: Background Audio + Lock Screen

**Files:**
- Modify: `apps/mobile/services/track-player.ts` (enhance playback service)
- Test with physical device

**Step 1:** Verify audio continues playing when app is backgrounded (home button / switch apps).

**Step 2:** Verify lock screen controls work: play/pause, skip next/previous, scrubber.

**Step 3:** Verify notification player appears on Android with correct track title and controls.

**Step 4:** Verify Bluetooth controls work: steering wheel next/previous, play/pause.

**Step 5:** Test audio focus: play audio, receive a phone call, verify audio pauses. End call, verify audio can be resumed.

**Step 6:** Commit.

### Phase 3: Offline Storage (Week 3-4)

#### Task 3.1: Set Up WatermelonDB

**Files:**
- Create: `apps/mobile/db/index.ts`
- Create: `apps/mobile/db/schema.ts`
- Create: `apps/mobile/db/models/Exam.ts`
- Create: `apps/mobile/db/models/Section.ts`
- Create: `apps/mobile/db/models/StudyItem.ts`
- Create: `apps/mobile/db/models/StudyProgress.ts`
- Create: `apps/mobile/db/models/Download.ts`
- Create: `apps/mobile/db/models/StudySession.ts`
- Create: `apps/mobile/db/migrations.ts`

**Step 1:** Install `@nozbe/watermelondb` and its Expo config plugin.

**Step 2:** Define the schema (as shown in Section 5).

**Step 3:** Create WatermelonDB model classes for each table.

**Step 4:** Initialize the database in the root layout provider.

**Step 5:** Test: write a record, read it back, verify it persists across app restarts.

**Step 6:** Commit.

#### Task 3.2: Implement Sync Adapter

**Files:**
- Create: `apps/mobile/db/sync.ts`
- Create: backend endpoint: `POST /api/sync/pull`
- Create: backend endpoint: `POST /api/sync/push`

**Step 1:** Implement the WatermelonDB sync adapter (as shown in Section 5).

**Step 2:** Build the backend `pull` endpoint: given `lastPulledAt` timestamp, return all changed records.

**Step 3:** Build the backend `push` endpoint: receive client changes, apply them to the server database.

**Step 4:** Test: create a study progress record on mobile (offline), trigger sync, verify it appears on the server.

**Step 5:** Test: add new content on the server, trigger sync on mobile, verify it appears locally.

**Step 6:** Commit.

#### Task 3.3: Build Download Manager

**Files:**
- Create: `apps/mobile/hooks/useDownloadManager.ts`
- Create: `apps/mobile/stores/download-store.ts`
- Create: `apps/mobile/components/DownloadButton.tsx`

**Step 1:** Create Zustand store for download state (per-section progress, active downloads).

**Step 2:** Implement `useDownloadManager` hook (as shown in Section 5).

**Step 3:** Build `DownloadButton` component: shows download progress (ring/percentage), triggers download on tap, shows checkmark when complete.

**Step 4:** Test: download a section's audio files, verify files exist on disk, verify progress updates in real-time.

**Step 5:** Commit.

#### Task 3.4: Wire Downloads to Player

**Files:**
- Modify: `apps/mobile/hooks/useTrackPlayer.ts`
- Modify: `apps/mobile/hooks/useStudySession.ts`

**Step 1:** When building a study session, check each item for `localAudioPath`. If it exists and the file is on disk, use the local path. Otherwise, use the remote URL.

**Step 2:** Test: download a section, enable airplane mode, play the section. Verify it plays entirely from local files.

**Step 3:** Test: partially download a section (3 of 10 items). Play the session. Verify downloaded items play offline, non-downloaded items fall back to streaming when online.

**Step 4:** Commit.

#### Task 3.5: Storage Management Screen

**Files:**
- Create: `apps/mobile/components/StorageManager.tsx`
- Modify: `apps/mobile/app/(tabs)/settings.tsx`

**Step 1:** Build storage management UI in Settings: total usage, per-section breakdown, delete button per section.

**Step 2:** Wire to `useDownloadManager.getStorageUsage()` and `deleteSection()`.

**Step 3:** Test: download content, verify storage shows correct size. Delete a section, verify space is reclaimed.

**Step 4:** Commit.

### Phase 4: Study Features (Week 4-5)

#### Task 4.1: Study Session Orchestrator

**Files:**
- Create: `apps/mobile/hooks/useStudySession.ts`

**Step 1:** Build the hook that orchestrates a complete study session:
- Accepts an exam/section ID and study mode (sequential/shuffle/spaced_repetition)
- Uses `session-builder` from `packages/shared` to order items
- Loads the session into `useTrackPlayer`
- Tracks progress as items are played (listened > 80% = "studied")
- Saves progress to WatermelonDB after each item

**Step 2:** Test each mode: sequential plays in order, shuffle randomizes, spaced repetition prioritizes items due for review.

**Step 3:** Commit.

#### Task 4.2: Study Mode Selector

**Files:**
- Create: `apps/mobile/components/StudyModeSelector.tsx`
- Modify: `apps/mobile/app/exam/section/[sectionId].tsx`

**Step 1:** Build the study mode selector UI: three options (Sequential, Shuffle, Spaced Repetition) with descriptions.

**Step 2:** Show item count per mode: Sequential shows total items, Spaced Repetition shows "X items due for review."

**Step 3:** "Start Session" button loads the session with the selected mode.

**Step 4:** Commit.

#### Task 4.3: Bookmarking

**Files:**
- Modify: `apps/mobile/db/models/StudyProgress.ts`
- Modify: `apps/mobile/components/FullPlayer.tsx`

**Step 1:** Add bookmark toggle to the full player screen (heart/flag icon).

**Step 2:** Tapping bookmark updates the `is_bookmarked` field in WatermelonDB.

**Step 3:** Add "Bookmarked Items" filter in the Library tab.

**Step 4:** Test: bookmark an item during playback, verify it appears in the bookmarked list, verify it persists across app restarts.

**Step 5:** Commit.

#### Task 4.4: Progress Dashboard

**Files:**
- Modify: `apps/mobile/app/(tabs)/progress.tsx`
- Create: `apps/mobile/components/ProgressRing.tsx`
- Create: `apps/mobile/components/StreakDisplay.tsx`

**Step 1:** Build progress dashboard: overall completion percentage (ring chart), current streak, items studied today, total study time.

**Step 2:** Per-exam breakdown: show completion percentage per section.

**Step 3:** Wire to WatermelonDB queries (observable -- updates in real time as user studies).

**Step 4:** Commit.

### Phase 5: Push Notifications (Week 5)

#### Task 5.1: Notification Setup

**Files:**
- Create: `apps/mobile/services/notifications.ts`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1:** Implement notification permission request, push token registration, and notification handler (as shown in Section 6).

**Step 2:** Request permissions on first launch (after onboarding, not immediately).

**Step 3:** Register push token with backend.

**Step 4:** Commit.

#### Task 5.2: Study Reminders

**Files:**
- Modify: `apps/mobile/services/notifications.ts`
- Modify: `apps/mobile/app/(tabs)/settings.tsx`

**Step 1:** Implement scheduled local notifications for daily study reminders and streak-at-risk alerts.

**Step 2:** Add notification preferences UI in Settings (time picker for reminder, toggles for each type).

**Step 3:** Test: set a reminder for 1 minute from now, verify notification fires.

**Step 4:** Commit.

#### Task 5.3: Smart Streak Notifications

**Files:**
- Modify: `apps/mobile/services/notifications.ts`
- Create: `apps/mobile/services/background-sync.ts`

**Step 1:** After each study session ends, recalculate streak and reschedule the streak-at-risk notification (only if user hasn't studied today).

**Step 2:** Register a background fetch task that runs periodically to update streak notifications even if the app isn't open.

**Step 3:** Test: study today, verify no streak-at-risk notification at 8pm. Don't study tomorrow, verify notification fires.

**Step 4:** Commit.

### Phase 6: White-Label + Additional Brands (Week 5-6)

#### Task 6.1: Second Brand Config

**Files:**
- Create: `apps/mobile/brands/cdl/brand.ts`
- Create: `apps/mobile/brands/cdl/assets/` (icon, splash, adaptive icon)

**Step 1:** Create CDL brand config with its own colors, display name, bundle ID.

**Step 2:** Build the app with `BRAND=cdl`. Verify the app shows CDL branding.

**Step 3:** Run both firefighter and CDL builds side by side on the same device (different bundle IDs allow this).

**Step 4:** Commit.

#### Task 6.2: EAS Build Pipeline

**Files:**
- Create: `apps/mobile/eas.json`
- Create: `scripts/build-brand.sh`
- Create: `scripts/build-all-brands.sh`

**Step 1:** Configure EAS build profiles (development, preview, production).

**Step 2:** Write build script that accepts brand + platform + profile arguments.

**Step 3:** Write batch build script that builds all brands.

**Step 4:** Test: run `BRAND=firefighter eas build --platform ios --profile preview`. Verify build succeeds on EAS servers.

**Step 5:** Commit.

#### Task 6.3: EAS Submit Configuration

**Files:**
- Modify: `apps/mobile/eas.json`
- Create per-brand App Store Connect entries

**Step 1:** Configure EAS Submit for iOS (Apple ID, ASC app ID per brand) and Android (service account key, track).

**Step 2:** Create App Store Connect entries for each brand (app name, bundle ID, category).

**Step 3:** Create Google Play Console entries for each brand (package name, category).

**Step 4:** Test: submit a preview build to TestFlight / Google Play Internal Testing.

**Step 5:** Commit.

### Phase 7: Polish + Launch Prep (Week 6-7)

#### Task 7.1: Onboarding Flow

**Files:**
- Create: `apps/mobile/app/onboarding/` (onboarding screens)

**Step 1:** Build 3-screen onboarding: (1) "Study by listening" value prop, (2) "Download for offline" feature highlight, (3) "Set a daily reminder" notification permission request.

**Step 2:** Show only on first launch. Store flag in AsyncStorage.

**Step 3:** Commit.

#### Task 7.2: Error Handling + Empty States

**Files:**
- Create: `apps/mobile/components/ErrorBoundary.tsx`
- Create: `apps/mobile/components/EmptyState.tsx`

**Step 1:** Add React error boundary that shows a friendly error screen with "Try Again" button.

**Step 2:** Add empty states for: no exams (brand has no content yet), no downloads (encourage downloading), no progress (encourage starting first session), no bookmarks.

**Step 3:** Commit.

#### Task 7.3: App Store Assets

**Files:**
- Create: per-brand App Store screenshots (6.7", 6.5", 5.5" iPhone; 12.9" iPad)
- Create: per-brand Play Store screenshots (phone, 7" tablet, 10" tablet)
- Create: per-brand App Store description text

**Step 1:** Capture screenshots from each brand's app on all required device sizes.

**Step 2:** Write App Store description, keywords, and promotional text per brand.

**Step 3:** Verify screenshots meet Apple's and Google's requirements (exact pixel dimensions, no alpha channels for iOS, etc.).

**Step 4:** Commit.

#### Task 7.4: Analytics Integration

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/services/analytics.ts`

**Step 1:** Integrate PostHog React Native SDK for event tracking.

**Step 2:** Track key events: `session_started`, `session_completed`, `item_studied`, `speed_changed`, `content_downloaded`, `bookmark_toggled`, `notification_permission_granted`.

**Step 3:** Set user properties: brand, subscription status, streak length, total items studied.

**Step 4:** Commit.

---

## Appendix A: Study Mode Details

### Sequential Mode
Items play in content order (Section 1 Item 1 -> 1.2 -> 1.3 -> ...). Best for first-time study.

### Shuffle Mode
Fisher-Yates shuffle of all items in the selected scope (section or exam). Best for review after initial study.

### Spaced Repetition Mode
SM-2 algorithm selects items due for review, prioritized by overdue-ness. Items the user found difficult appear more frequently. Items marked as "easy" appear at increasing intervals (1 day -> 3 days -> 7 days -> 14 days -> ...).

The SM-2 parameters live in `study_progress`: `ease_factor` (starts at 2.5), `interval_days`, `next_review_at`. After each study of an item, the user can rate difficulty (via a quick gesture or automatic detection: if they replayed the item, it's "hard"; if they skipped forward, it's "easy").

## Appendix B: Mapping from try-listening Prototype

| Prototype (web) | Mobile Equivalent | Notes |
|-----------------|-------------------|-------|
| `useAudioPlayer` (HTMLAudioElement + chunk management) | `useTrackPlayer` (RNTP queue) | Web manages individual audio chunks; mobile uses complete files in a queue. |
| `useOfflineAudio` (IndexedDB blob storage) | `useDownloadManager` (expo-file-system) | Web stores blobs in IDB; mobile stores files on filesystem. |
| `useMediaSession` (navigator.mediaSession) | RNTP built-in | Web Media Session API mirrors what RNTP does natively. |
| `usePlaybackPersistence` (throttled API calls + keepalive) | Zustand + WatermelonDB + periodic sync | Mobile persists locally first, syncs to server later. More robust for offline. |
| `idb-audio-store.ts` (IndexedDB CRUD) | WatermelonDB models + expo-file-system | Structured data in SQLite, audio files on filesystem. |
| `PlayerBar` component | `MiniPlayer` + `FullPlayer` components | Mobile has both a mini player (persistent) and full-screen player. |
| `SpeedButton` component | `SpeedControl` component | Same concept, mobile-native UI (e.g., horizontal scroll picker). |
| `NowPlayingCard` component | `FullPlayer` top section | The "now playing" info is part of the full player screen. |
| Chunk-based TTS generation on demand | Pre-generated audio files | Mobile downloads complete audio files. No on-device TTS generation. |

## Appendix C: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Apple rejects "reader app" billing model | Medium | High | Have RevenuCat/StoreKit integration ready as fallback. Budget 15-30% revenue loss. |
| react-native-track-player bugs on specific Android devices | Medium | Medium | Test on 5+ Android devices (Samsung, Pixel, OnePlus). RNTP has large community + active maintenance. |
| WatermelonDB sync conflicts lose data | Low | High | Server-side conflict logging. Client-side retry queue. Manual conflict resolution UI for edge cases. |
| Expo SDK upgrade breaks native modules | Medium | Medium | Pin Expo SDK version. Only upgrade between major releases with thorough testing. |
| App Store review takes weeks (new developer account) | High | Medium | Submit first build early (even with minimal content). First review is slowest; subsequent reviews are faster. |
| Audio files consume too much device storage | Medium | Low | Aggressive storage management UI. Suggest deleting completed sections. Default to streaming; download is opt-in. |
| Background audio stops on low-memory Android devices | Medium | Medium | RNTP foreground service handles this. Test on budget Android devices (2GB RAM). |
