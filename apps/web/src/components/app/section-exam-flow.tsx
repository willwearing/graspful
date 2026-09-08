"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import { trackSectionExamStarted, trackSectionExamQuestionAnswered, trackSectionExamCompleted } from "@/lib/posthog/events";

export interface SectionExamData {
  sessionId: string;
  totalProblems: number;
  timeLimitMs: number;
  startedAt?: string;
  expiresAt?: string | null;
  answeredProblemIds?: string[];
  instructions: string;
  passingScore: number;
  problems: Problem[];
}

interface SectionExamResult {
  sessionId: string;
  sectionId: string;
  passed: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  xpAwarded: number;
  failedConcepts: string[];
  conceptBreakdown: Array<{
    conceptId: string;
    conceptName: string;
    correct: number;
    total: number;
  }>;
}

interface SectionExamFlowProps {
  orgSlug: string;
  courseId: string;
  sectionId: string;
  token: string;
  examData: SectionExamData;
  backToCourseHref?: string;
  continueHref?: string;
}

export function SectionExamFlow({
  orgSlug,
  courseId,
  sectionId,
  token,
  examData,
  backToCourseHref,
  continueHref,
}: SectionExamFlowProps) {
  const router = useRouter();
  const [answeredProblemIds, setAnsweredProblemIds] = useState(() => new Set(examData.answeredProblemIds ?? []));
  const currentIndex = examData.problems.findIndex((problem) => !answeredProblemIds.has(problem.id));
  const answeredCount = examData.problems.filter((problem) => answeredProblemIds.has(problem.id)).length;
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<SectionExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionFailed, setCompletionFailed] = useState(false);
  const questionStartRef = useRef(Date.now());
  const finishCalledRef = useRef(false);
  const completedRef = useRef(false);
  const pendingAnswerRef = useRef<Promise<void> | null>(null);
  const [deadline] = useState(() => {
    if (examData.expiresAt === null) return null;
    if (examData.expiresAt) return Date.parse(examData.expiresAt);
    const startedAt = examData.startedAt ? Date.parse(examData.startedAt) : Date.now();
    return startedAt + examData.timeLimitMs;
  });
  const [timeLeftMs, setTimeLeftMs] = useState(() => deadline === null ? null : Math.max(0, deadline - Date.now()));
  const expired = timeLeftMs === 0;

  const basePath = `/orgs/${orgSlug}/courses/${courseId}/sections/${sectionId}/exam`;

  useEffect(() => {
    if (!examData.answeredProblemIds?.length) {
      trackSectionExamStarted(sectionId, examData.totalProblems, examData.timeLimitMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFinish() {
    if (finishCalledRef.current || completedRef.current) return;
    finishCalledRef.current = true;
    setFinishing(true);
    setCompletionFailed(false);
    setError(null);

    // A submitted answer must settle before the server grades this attempt.
    await pendingAnswerRef.current;
    try {
      const response = await apiClientFetch<SectionExamResult>(
        `${basePath}/${examData.sessionId}/complete`,
        token,
        { method: "POST" }
      );
      completedRef.current = true;
      trackSectionExamCompleted(sectionId, response.passed, response.score);
      setResult(response);
    } catch {
      setCompletionFailed(true);
      setError("Could not complete the section exam. Your saved answers are kept. Try again.");
    } finally {
      finishCalledRef.current = false;
      setFinishing(false);
    }
  }

  const finishRef = useRef(handleFinish);
  useEffect(() => {
    finishRef.current = handleFinish;
  });

  useEffect(() => {
    if (deadline === null || result) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    function updateRemainingTime() {
      const remaining = Math.max(0, deadline! - Date.now());
      setTimeLeftMs(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        void finishRef.current();
      }
    }
    if (deadline <= Date.now()) {
      updateRemainingTime();
    } else {
      interval = setInterval(updateRemainingTime, 1000);
    }
    return () => clearInterval(interval);
  }, [deadline, result]);

  function formatTime(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleSubmit(answer: ProblemAnswer) {
    if (pendingAnswerRef.current || finishCalledRef.current || completedRef.current || currentIndex < 0) return;
    if (deadline !== null && deadline <= Date.now()) {
      setTimeLeftMs(0);
      void handleFinish();
      return;
    }
    const problemId = examData.problems[currentIndex].id;
    const submittedIndex = currentIndex;
    const responseTimeMs = Date.now() - questionStartRef.current;
    setSubmitting(true);
    setError(null);

    const pending = (async () => {
      try {
        await apiClientFetch<{ answeredCount: number; totalProblems: number }>(
          `${basePath}/${examData.sessionId}/answer`,
          token,
          {
            method: "POST",
            body: JSON.stringify({ problemId, answer, responseTimeMs }),
          }
        );
        trackSectionExamQuestionAnswered(sectionId, submittedIndex, responseTimeMs);
        setAnsweredProblemIds((previous) => new Set([...previous, problemId]));
        questionStartRef.current = Date.now();
      } catch {
        // Keep the problem mounted so the learner can retry the selected answer.
        setError("Could not save your answer. Your selection is kept. Try again.");
      } finally {
        pendingAnswerRef.current = null;
        setSubmitting(false);
      }
    })();
    pendingAnswerRef.current = pending;
    await pending;
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="text-center space-y-2">
          <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${result.passed ? "text-emerald-600" : "text-amber-700"}`}>
            {result.passed ? "Certified" : "Needs review"}
          </p>
          <h2 className="text-3xl font-bold text-foreground">
            {Math.round(result.score * 100)}%
          </h2>
          <p className="text-muted-foreground">
            {result.correctCount} of {result.totalCount} correct
            {result.xpAwarded > 0 ? ` (+${result.xpAwarded} XP)` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Passing score</span>
            <span className="font-medium text-foreground">
              {Math.round(examData.passingScore * 100)}%
            </span>
          </div>
          {result.conceptBreakdown.map((item) => (
            <div key={item.conceptId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{item.conceptName}</span>
              <span className="text-muted-foreground">
                {item.correct}/{item.total}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" render={<Link href={backToCourseHref ?? `/browse/${courseId}`} />}>
            Back to course
          </Button>
          <Button
            className="flex-1"
            variant={result.passed ? "default" : "secondary"}
            onClick={() => router.push(continueHref ?? `/study/${courseId}`)}
          >
            {result.passed ? "Continue studying" : "Start review"}
          </Button>
        </div>
      </div>
    );
  }

  const problem = examData.problems[currentIndex];
  const allAnswered = answeredCount >= examData.totalProblems;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Section exam
        </p>
        <h1 className="text-2xl font-bold text-foreground">Check your understanding</h1>
        {examData.instructions ? (
          <p className="text-sm text-muted-foreground">{examData.instructions}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {allAnswered ? `${answeredCount} of ${examData.totalProblems} answers saved` : `Question ${currentIndex + 1} of ${examData.totalProblems}`}
        </span>
        <span className={`flex items-center gap-1 text-sm font-medium ${timeLeftMs !== null && timeLeftMs < 60000 ? "text-destructive" : "text-muted-foreground"}`}>
          <Clock className="h-4 w-4" />
          {timeLeftMs === null ? "Untimed" : formatTime(timeLeftMs)}
        </span>
      </div>

      <Progress value={(answeredCount / Math.max(1, examData.totalProblems)) * 100} className="h-2" />

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {problem && !expired ? (
        <ProblemRenderer
          key={problem.id}
          problem={problem}
          onSubmit={handleSubmit}
          disabled={submitting || finishing}
          loading={submitting}
        />
      ) : null}

      {expired ? (
        <p className="text-sm text-muted-foreground">Time is up. Unanswered questions count as incorrect.</p>
      ) : null}

      {submitting ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="size-4 animate-spin" />
          Saving answer...
        </div>
      ) : null}

      {allAnswered || expired || completionFailed ? (
        <Button onClick={() => void handleFinish()} className="w-full" disabled={submitting || finishing}>
          {finishing ? "Completing section exam..." : completionFailed ? "Retry completion" : "Finish section exam"}
        </Button>
      ) : null}
    </div>
  );
}
