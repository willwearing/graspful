"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, ClipboardList, Play, Pause, Volume2 } from "lucide-react";
import { useAudioPlayer } from "@/lib/hooks/use-audio-player";
import { useLessonAudio } from "@/lib/hooks/use-lesson-audio";
import { trackLessonComplete } from "@/lib/posthog/events";

interface KnowledgePoint {
  id: string;
  slug: string;
  instructionText: string;
  workedExampleText: string;
}

interface LessonData {
  conceptId: string;
  conceptName: string;
  knowledgePoints: KnowledgePoint[];
}

interface LessonFlowProps {
  orgId: string;
  courseId: string;
  token: string;
  lesson: LessonData;
}

type KPPhase = "instruction" | "worked-example" | "practice";

export function LessonFlow({ orgId, courseId, token, lesson }: LessonFlowProps) {
  const router = useRouter();
  const [currentKP, setCurrentKP] = useState(0);
  const [phase, setPhase] = useState<KPPhase>("instruction");
  const [completing, setCompleting] = useState(false);
  const { audioUrls } = useLessonAudio(orgId, lesson.knowledgePoints, token);
  const { loadQueue, isPlaying, currentItem } = useAudioPlayer();
  const lessonStartRef = useRef(Date.now());

  const kp = lesson.knowledgePoints[currentKP];
  const isLast = currentKP === lesson.knowledgePoints.length - 1;

  // Progress accounts for 3 phases per KP
  const totalPhases = lesson.knowledgePoints.length * 3;
  const currentPhaseIndex = currentKP * 3 + (phase === "instruction" ? 0 : phase === "worked-example" ? 1 : 2);
  const progressPercent = ((currentPhaseIndex + 1) / totalPhases) * 100;

  function advancePhase() {
    if (phase === "instruction") {
      setPhase(kp.workedExampleText ? "worked-example" : "practice");
    } else if (phase === "worked-example") {
      setPhase("practice");
    } else {
      // practice done — move to next KP or complete
      if (!isLast) {
        setCurrentKP((prev) => prev + 1);
        setPhase("instruction");
      }
    }
  }

  function goBack() {
    if (phase === "practice") {
      setPhase(kp.workedExampleText ? "worked-example" : "instruction");
    } else if (phase === "worked-example") {
      setPhase("instruction");
    } else if (currentKP > 0) {
      setCurrentKP((prev) => prev - 1);
      setPhase("practice");
    }
  }

  const canGoBack = phase !== "instruction" || currentKP > 0;

  async function handleComplete() {
    setCompleting(true);
    try {
      await apiClientFetch(
        `/orgs/${orgId}/courses/${courseId}/lessons/${lesson.conceptId}/complete`,
        token,
        { method: "POST" }
      );
      const durationSeconds = Math.round((Date.now() - lessonStartRef.current) / 1000);
      trackLessonComplete(lesson.conceptId, lesson.conceptName, durationSeconds);
      router.push(`/study/${courseId}`);
    } catch {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{lesson.conceptName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Knowledge Point {currentKP + 1} of {lesson.knowledgePoints.length}
        </p>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {/* Phase 1: Instruction */}
      {phase === "instruction" && (
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpen className="h-4 w-4" />
            Instruction
          </div>
          <p className="text-foreground leading-relaxed">{kp.instructionText}</p>

          {/* Audio playback */}
          {(() => {
            const kpAudio = audioUrls.get(kp.id);
            const hasAudio = kpAudio?.instructionUrl;
            const isCurrentlyPlaying = isPlaying && currentItem?.id === kp.id;

            if (!hasAudio) {
              return (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  Audio not available
                </div>
              );
            }

            return (
              <button
                onClick={() =>
                  loadQueue([
                    {
                      id: kp.id,
                      title: `${lesson.conceptName} - ${kp.slug}`,
                      audioUrl: kpAudio.instructionUrl!,
                      durationSeconds: kpAudio.instructionDuration,
                    },
                  ])
                }
                className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary hover:bg-primary/20 transition-colors w-full"
              >
                {isCurrentlyPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isCurrentlyPlaying ? "Playing..." : "Listen to instruction"}
              </button>
            );
          })()}
        </div>
      )}

      {/* Phase 2: Worked Example */}
      {phase === "worked-example" && kp.workedExampleText && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Worked Example</p>
          <p className="text-foreground leading-relaxed">{kp.workedExampleText}</p>
        </div>
      )}

      {/* Phase 3: Practice (placeholder) */}
      {/*
        TODO: Replace this placeholder with real practice problems.
        Needs a "GET /orgs/:orgId/courses/:courseId/lessons/:conceptId/kps/:kpId/problems" endpoint
        (or similar) that returns practice problems for a given KP.
        Once available, render problems here and submit answers via:
          POST /orgs/:orgId/courses/:courseId/lessons/:conceptId/answer
          body: { problemId, answer, responseTimeMs }
      */}
      {phase === "practice" && (
        <div className="rounded-lg border border-dashed border-border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ClipboardList className="h-4 w-4" />
            Practice
          </div>
          <div className="text-center py-4 space-y-3">
            <p className="text-muted-foreground">
              Practice problems coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              Review the instruction and worked example above, then mark this concept as understood to continue.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {canGoBack && (
          <Button variant="outline" onClick={goBack}>
            Previous
          </Button>
        )}
        <div className="flex-1" />
        {phase === "practice" && isLast ? (
          <Button onClick={handleComplete} disabled={completing}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completing ? "Completing..." : "Complete Lesson"}
          </Button>
        ) : phase === "practice" ? (
          <Button onClick={advancePhase}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Understood
          </Button>
        ) : (
          <Button onClick={advancePhase}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
