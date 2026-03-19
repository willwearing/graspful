"use client";

import { useEffect, useState } from "react";
import { apiClientFetch } from "@/lib/api-client";

interface AudioUrlInfo {
  url: string;
  durationSeconds?: number;
  voice: string;
  format: string;
}

interface KnowledgePointAudio {
  instructionUrl?: string;
  instructionDuration?: number;
}

interface KnowledgePoint {
  id: string;
}

export function useLessonAudio(
  orgSlug: string,
  knowledgePoints: KnowledgePoint[],
  token: string,
) {
  const [audioUrls, setAudioUrls] = useState<Map<string, KnowledgePointAudio>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || knowledgePoints.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAudioUrls() {
      const results = new Map<string, KnowledgePointAudio>();

      // Fetch audio URLs for all KPs in parallel
      const promises = knowledgePoints.map(async (kp) => {
        try {
          const data = await apiClientFetch<AudioUrlInfo>(
            `/orgs/${orgSlug}/audio/${kp.id}`,
            token,
          );
          results.set(kp.id, {
            instructionUrl: data.url,
            instructionDuration: data.durationSeconds,
          });
        } catch {
          // Audio not available for this KP -- that's fine
          results.set(kp.id, {});
        }
      });

      await Promise.all(promises);

      if (!cancelled) {
        setAudioUrls(results);
        setLoading(false);
      }
    }

    fetchAudioUrls();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, token, knowledgePoints.length]);

  return { audioUrls, loading };
}
