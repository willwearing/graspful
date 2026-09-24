"use client";

interface KnowledgePointAudio {
  instructionUrl?: string;
  instructionDuration?: number;
}

interface KnowledgePoint {
  id: string;
  instructionAudioUrl?: string | null;
  instructionAudioDurationSeconds?: number | null;
}

/** Lesson responses already include audio. Never query the legacy study-item API for KP IDs. */
export function useLessonAudio(knowledgePoints: KnowledgePoint[]) {
  const audioUrls = new Map<string, KnowledgePointAudio>(
    knowledgePoints.map((point) => [point.id, {
      instructionUrl: point.instructionAudioUrl ?? undefined,
      instructionDuration: point.instructionAudioDurationSeconds ?? undefined,
    }]),
  );
  return { audioUrls, loading: false };
}
