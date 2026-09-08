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
import { trackLessonComplete, trackLessonStarted, trackLessonPracticeAnswered, trackLessonAudioPlayed, trackLessonAbandoned } from "@/lib/posthog/events";
import { LessonRichContent } from "@/components/app/lesson-rich-content";
import { MarkdownText } from "@/components/app/markdown-text";
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
  orgSlug: string;
  courseId: string;
  token: string;
  lesson: LessonData;
  continueHref?: string;
}

type KPPhase = "instruction" | "worked-example" | "practice";

interface NextProblemHint {
  targetKPId: string;
  nextProblemId: string | null;
  reopenWorkedExample: boolean;
  retryDelayMs: number;
  lessonComplete: boolean;
}

interface PracticeSubmission {
  body: string;
  problemId: string;
  responseTimeMs: number;
}

export function LessonFlow({ orgSlug, courseId, token, lesson, continueHref }: LessonFlowProps) {
  const router = useRouter();
  const [currentKP, setCurrentKP] = useState(0);
  const [phase, setPhase] = useState<KPPhase>("instruction");
  const [completing, setCompleting] = useState(false);
  // Slice 1 — practice loop is driven by `currentProblemId` rather than an
  // index into a pre-computed list. On a miss, the backend tells us which
  // problem (and which KP) to serve next via `nextProblemHint`.
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<ProblemFeedback | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceAttempt, setPracticeAttempt] = useState(0);
  const [workedExampleOpen, setWorkedExampleOpen] = useState(true);
  // True when the current KP's practice is done — either via lessonComplete
  // hint, KP advancement hint, or fallback exhaustion. Distinguishes "no
  // problem selected yet" (initial) from "all done" (post-practice).
  const [kpPracticeDone, setKpPracticeDone] = useState(false);
  // Problems the learner has seen in this lesson session — sent to the backend
  // so the selector can prefer unseen problems and apply retry delays.
  const seenProblemIdsRef = useRef<string[]>([]);
  // KPs for which the worked example has already been auto-re-opened once this
  // session. Prevents repeated noise on repeated misses.
  const reopenedKPIdsRef = useRef<string[]>([]);
  const { audioUrls } = useLessonAudio(orgSlug, lesson.knowledgePoints, token);
  const { loadQueue, isPlaying, currentItem } = useAudioPlayer();
  const lessonStartRef = useRef(0);
  const practiceStartRef = useRef(0);
  const currentKPRef = useRef(currentKP);
  const phaseRef = useRef(phase);
  const completedRef = useRef(false);
  const pendingSubmissionRef = useRef<PracticeSubmission | null>(null);
  const practiceRequestRef = useRef(false);
  const completionRequestRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const kp = lesson.knowledgePoints[currentKP];
  const problems = kp.problems ?? [];
  const instructionContent = kp.instructionContent ?? [];
  const workedExampleContent = kp.workedExampleContent ?? [];
  const isLast = currentKP === lesson.knowledgePoints.length - 1;
  const currentProblem =
    problems.find((p) => p.id === currentProblemId) ??
    (currentProblemId === null && !kpPracticeDone ? problems[0] ?? null : null);
  const practiceComplete = problems.length === 0 || kpPracticeDone;

  // Progress accounts for 3 phases per KP
  const totalPhases = lesson.knowledgePoints.length * 3;
  const currentPhaseIndex = currentKP * 3 + (phase === "instruction" ? 0 : phase === "worked-example" ? 1 : 2);
  const progressPercent = ((currentPhaseIndex + 1) / totalPhases) * 100;

  useEffect(() => { currentKPRef.current = currentKP; }, [currentKP]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Track abandonment on unmount if not complete
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (!completedRef.current) {
        const durationSeconds = Math.round((Date.now() - lessonStartRef.current) / 1000);
        trackLessonAbandoned(
          courseId,
          lesson.conceptId,
          lesson.conceptName,
          currentKPRef.current + 1,
          lesson.knowledgePoints.length,
          phaseRef.current,
          durationSeconds,
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    lessonStartRef.current = startedAt;
    practiceStartRef.current = startedAt;
    trackLessonStarted(courseId, lesson.conceptId, lesson.conceptName, lesson.knowledgePoints.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetPractice() {
    // On entering practice, seed with the first authored problem for this KP.
    // The backend hint will take over after the first submission.
    const first = kp.problems?.[0]?.id ?? null;
    setCurrentProblemId(first);
    setKpPracticeDone(false);
    setPracticeFeedback(null);
    setPracticeError(null);
    pendingSubmissionRef.current = null;
    setPracticeAttempt((attempt) => attempt + 1);
    setPracticeSubmitting(false);
    practiceStartRef.current = Date.now();
  }

  function advancePhase() {
    if (phase === "instruction") {
      setPhase(kp.workedExampleText ? "worked-example" : "practice");
      setWorkedExampleOpen(true);
      if (!kp.workedExampleText) resetPractice();
    } else if (phase === "worked-example") {
      setPhase("practice");
      setWorkedExampleOpen(false);
      resetPractice();
    } else {
      // practice done — move to next KP or complete
      if (!isLast) {
        setCurrentKP((prev) => prev + 1);
        setPhase("instruction");
        setWorkedExampleOpen(true);
        // Let the next effect pick the first problem for the new KP
        setCurrentProblemId(null);
        setKpPracticeDone(false);
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
      setCurrentProblemId(null);
      setPracticeFeedback(null);
      setPracticeSubmitting(false);
    }
  }

  const canGoBack = phase !== "instruction" || currentKP > 0;

  async function handleComplete() {
    if (completionRequestRef.current) return;
    completionRequestRef.current = true;
    setCompleting(true);
    setCompletionError(null);
    try {
      await apiClientFetch(
        `/orgs/${orgSlug}/courses/${courseId}/lessons/${lesson.conceptId}/complete`,
        token,
        { method: "POST" }
      );
      const durationSeconds = Math.round((Date.now() - lessonStartRef.current) / 1000);
      trackLessonComplete(lesson.conceptId, lesson.conceptName, durationSeconds);
      completedRef.current = true;
      router.push(continueHref ?? `/study/${courseId}`);
    } catch {
      setCompletionError("Could not save lesson completion. Try again to check your progress.");
      setCompleting(false);
    } finally {
      completionRequestRef.current = false;
    }
  }

  /**
   * Slice 1 — Apply the backend's next-problem hint to the local state machine.
   *
   * - On miss: stay on the same KP, load the suggested next problem, and
   *   re-surface the worked example (first miss per KP per session only).
   * - On pass: advance to the next KP the hint points at, or mark lesson
   *   complete if we were on the last KP.
   */
  function applyNextProblemHint(hint: NextProblemHint | null) {
    if (!hint) {
      // Fallback to legacy behavior: advance within the current KP's problem list.
      const idx = problems.findIndex((p) => p.id === currentProblemId);
      const next = idx >= 0 ? problems[idx + 1] ?? null : null;
      if (!next) {
        setKpPracticeDone(true);
      }
      setCurrentProblemId(next?.id ?? null);
      return;
    }

    if (hint.lessonComplete) {
      setKpPracticeDone(true);
      setCurrentProblemId(null);
      return;
    }

    if (hint.reopenWorkedExample) {
      setWorkedExampleOpen(true);
      reopenedKPIdsRef.current = Array.from(
        new Set([...reopenedKPIdsRef.current, hint.targetKPId]),
      );
    }

    // If the hint points at a different KP, navigate to it.
    if (hint.targetKPId !== kp.id) {
      const targetIdx = lesson.knowledgePoints.findIndex(
        (k) => k.id === hint.targetKPId,
      );
      if (targetIdx >= 0) {
        setKpPracticeDone(false);
        setCurrentKP(targetIdx);
        setPhase("practice");
      }
    }

    setCurrentProblemId(hint.nextProblemId);
    practiceStartRef.current = Date.now();
  }

  async function handlePracticeSubmit(answer: ProblemAnswer) {
    if (!currentProblem || pendingSubmissionRef.current || practiceRequestRef.current || practiceSubmitting || practiceFeedback) return;

    // Record this problem as seen BEFORE submission so the backend selector
    // can avoid repeating it when choosing the next hint.
    const submittedProblemId = currentProblem.id;
    if (!seenProblemIdsRef.current.includes(submittedProblemId)) {
      seenProblemIdsRef.current = [
        ...seenProblemIdsRef.current,
        submittedProblemId,
      ];
    }

    const responseTimeMs = Math.max(1, Date.now() - practiceStartRef.current);
    const submission = {
      problemId: submittedProblemId,
      responseTimeMs,
      // Keep the serialized payload until a response arrives. The server may
      // have saved an answer even when its response did not reach the browser.
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        problemId: submittedProblemId,
        answer,
        responseTimeMs,
        seenProblemIds: seenProblemIdsRef.current,
        workedExampleReopenedKPIds: reopenedKPIdsRef.current,
      }),
    };
    pendingSubmissionRef.current = submission;
    await sendPracticeSubmission(submission);
  }

  async function sendPracticeSubmission(submission: PracticeSubmission) {
    if (practiceRequestRef.current) return;
    practiceRequestRef.current = true;
    setPracticeSubmitting(true);
    setPracticeError(null);

    try {
      const response = await apiClientFetch<{
        correct: boolean;
        feedback: string;
        nextProblemHint: NextProblemHint | null;
      }>(
        `/orgs/${orgSlug}/courses/${courseId}/lessons/${lesson.conceptId}/answer`,
        token,
        {
          method: "POST",
          body: submission.body,
        }
      );
      if (!mountedRef.current) return;
      pendingSubmissionRef.current = null;

      trackLessonPracticeAnswered(
        lesson.conceptId,
        submission.problemId,
        response.correct,
        submission.responseTimeMs,
      );
      setPracticeFeedback({
        wasCorrect: response.correct,
        explanation: response.feedback,
      });

      const delay = response.nextProblemHint?.retryDelayMs ?? 1500;
      advanceTimeoutRef.current = setTimeout(() => {
        setPracticeFeedback(null);
        setPracticeSubmitting(false);
        setPracticeAttempt((attempt) => attempt + 1);
        applyNextProblemHint(response.nextProblemHint ?? null);
      }, Math.max(1500, delay));
    } catch {
      setPracticeSubmitting(false);
      setPracticeError("Could not confirm your answer was saved. Retry to check the same answer.");
    } finally {
      practiceRequestRef.current = false;
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
          <MarkdownText>{kp.instructionText}</MarkdownText>
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
                onClick={() => {
                  trackLessonAudioPlayed(lesson.conceptId, kp.slug);
                  loadQueue([
                    {
                      id: kp.id,
                      title: `${lesson.conceptName} - ${kp.slug}`,
                      audioUrl: kpAudio.instructionUrl!,
                      durationSeconds: kpAudio.instructionDuration,
                    },
                  ]);
                }}
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
          <MarkdownText>{kp.workedExampleText}</MarkdownText>
          <LessonRichContent blocks={workedExampleContent} />
        </div>
      )}

      {phase === "practice" && (
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ClipboardList className="h-4 w-4" />
            Practice
          </div>

          {/* Re-surfaced worked example — same content verbatim, collapsible. */}
          {kp.workedExampleText && (
            <details
              open={workedExampleOpen}
              onToggle={(e) =>
                setWorkedExampleOpen((e.target as HTMLDetailsElement).open)
              }
              className="rounded-lg border border-border bg-muted/20 p-4"
            >
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Review the worked example
              </summary>
              <div className="mt-3 space-y-2">
                <MarkdownText>{kp.workedExampleText}</MarkdownText>
                <LessonRichContent blocks={workedExampleContent} />
              </div>
            </details>
          )}

          {practiceError && (
            <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p>{practiceError}</p>
              <Button variant="outline" className="mt-3" disabled={practiceSubmitting} onClick={() => {
                if (pendingSubmissionRef.current) void sendPracticeSubmission(pendingSubmissionRef.current);
              }}>
                Retry answer
              </Button>
            </div>
          )}

          {!practiceComplete && currentProblem ? (
            <ProblemRenderer
              key={`${currentProblem.id}:${practiceAttempt}`}
              problem={currentProblem}
              onSubmit={handlePracticeSubmit}
              disabled={practiceSubmitting || !!practiceFeedback || !!practiceError}
              loading={practiceSubmitting && !practiceFeedback}
              feedback={practiceFeedback ?? undefined}
            />
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

      {completionError && (
        <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {completionError}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {canGoBack && (
          <Button variant="outline" onClick={goBack} disabled={practiceSubmitting || !!practiceError || completing}>
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
            {completing ? "Completing..." : completionError ? "Retry completion" : "Complete Lesson"}
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
