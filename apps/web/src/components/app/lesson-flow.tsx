"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer, type ProblemFeedback } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, ClipboardList, Play, Pause, Volume2 } from "lucide-react";
import { useAudioPlayer } from "@/lib/hooks/use-audio-player";
import { useLessonAudio } from "@/lib/hooks/use-lesson-audio";
import { trackLessonComplete } from "@/lib/posthog/events";
import { LessonRichContent } from "@/components/app/lesson-rich-content";
import type { Problem, ProblemAnswer, RichContentBlock } from "@/lib/types";

interface KnowledgePoint {
  id: string;
  slug: string;
  instructionText: string;
  instructionContent?: RichContentBlock[];
  workedExampleText: string;
  workedExampleContent?: RichContentBlock[];
  problems?: Problem[];
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
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceFeedback, setPracticeFeedback] = useState<ProblemFeedback | null>(null);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const { audioUrls } = useLessonAudio(orgId, lesson.knowledgePoints, token);
  const { loadQueue, isPlaying, currentItem } = useAudioPlayer();
  const lessonStartRef = useRef(0);
  const practiceStartRef = useRef(0);

  const kp = lesson.knowledgePoints[currentKP];
  const problems = kp.problems ?? [];
  const instructionContent = kp.instructionContent ?? [];
  const workedExampleContent = kp.workedExampleContent ?? [];
  const isLast = currentKP === lesson.knowledgePoints.length - 1;
  const currentProblem = problems[practiceIndex] ?? null;
  const practiceComplete = problems.length === 0 || practiceIndex >= problems.length;

  // Progress accounts for 3 phases per KP
  const totalPhases = lesson.knowledgePoints.length * 3;
  const currentPhaseIndex = currentKP * 3 + (phase === "instruction" ? 0 : phase === "worked-example" ? 1 : 2);
  const progressPercent = ((currentPhaseIndex + 1) / totalPhases) * 100;

  useEffect(() => {
    const startedAt = Date.now();
    lessonStartRef.current = startedAt;
    practiceStartRef.current = startedAt;
  }, []);

  function resetPractice() {
    setPracticeIndex(0);
    setPracticeFeedback(null);
    setPracticeSubmitting(false);
    practiceStartRef.current = Date.now();
  }

  function advancePhase() {
    if (phase === "instruction") {
      setPhase(kp.workedExampleText ? "worked-example" : "practice");
      if (!kp.workedExampleText) resetPractice();
    } else if (phase === "worked-example") {
      setPhase("practice");
      resetPractice();
    } else {
      // practice done — move to next KP or complete
      if (!isLast) {
        setCurrentKP((prev) => prev + 1);
        setPhase("instruction");
        resetPractice();
      }
    }
  }

  function goBack() {
    if (phase === "practice") {
      setPhase(kp.workedExampleText ? "worked-example" : "instruction");
    } else if (phase === "worked-example") {
      setPhase("instruction");
    } else if (currentKP > 0) {
      const prevKP = lesson.knowledgePoints[currentKP - 1];
      const prevProblems = prevKP.problems ?? [];
      setCurrentKP((prev) => prev - 1);
      setPhase("practice");
      setPracticeIndex(prevProblems.length);
      setPracticeFeedback(null);
      setPracticeSubmitting(false);
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

  async function handlePracticeSubmit(answer: ProblemAnswer) {
    if (!currentProblem || practiceSubmitting) return;
    setPracticeSubmitting(true);

    try {
      const response = await apiClientFetch<{
        correct: boolean;
        feedback: string;
      }>(
        `/orgs/${orgId}/courses/${courseId}/lessons/${lesson.conceptId}/answer`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            problemId: currentProblem.id,
            answer,
            responseTimeMs: Date.now() - practiceStartRef.current,
          }),
        }
      );

      setPracticeFeedback({
        wasCorrect: response.correct,
        explanation: response.feedback,
      });

      setTimeout(() => {
        setPracticeFeedback(null);
        setPracticeSubmitting(false);
        setPracticeIndex((prev) => prev + 1);
        practiceStartRef.current = Date.now();
      }, 1500);
    } catch {
      setPracticeSubmitting(false);
      setPracticeFeedback({
        wasCorrect: false,
        explanation: "Could not submit your answer. Please try again.",
      });
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
          <p className="text-foreground leading-relaxed whitespace-pre-line">{kp.instructionText}</p>
          <LessonRichContent blocks={instructionContent} />

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
          <p className="text-foreground leading-relaxed whitespace-pre-line">{kp.workedExampleText}</p>
          <LessonRichContent blocks={workedExampleContent} />
        </div>
      )}

      {phase === "practice" && (
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ClipboardList className="h-4 w-4" />
            Practice
          </div>
          {!practiceComplete && currentProblem ? (
            <>
              <p className="text-sm text-muted-foreground">
                Problem {practiceIndex + 1} of {problems.length}
              </p>
              <ProblemRenderer
                key={currentProblem.id}
                problem={currentProblem}
                onSubmit={handlePracticeSubmit}
                disabled={practiceSubmitting || !!practiceFeedback}
                feedback={practiceFeedback ?? undefined}
              />
            </>
          ) : problems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              No practice problems are authored for this knowledge point yet.
            </div>
          ) : (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Practice complete
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                You have worked through all authored practice problems for this knowledge point.
              </p>
            </div>
          )}
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
        {phase === "practice" && !practiceComplete ? (
          <p className="self-center text-sm text-muted-foreground">
            Finish the practice problems to continue
          </p>
        ) : phase === "practice" && isLast ? (
          <Button onClick={handleComplete} disabled={completing}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completing ? "Completing..." : "Complete Lesson"}
          </Button>
        ) : phase === "practice" ? (
          <Button onClick={advancePhase} disabled={!practiceComplete}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Continue
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
