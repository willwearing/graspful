"use client";

import { useState, useRef, useCallback } from "react";
import { useAnswerSubmission } from "@/lib/hooks/use-answer-submission";
import { useLatestRef } from "@/lib/hooks/use-latest-ref";
import { useMountEffect } from "@/lib/hooks/use-mount-effect";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import Link from "next/link";
import { Clock, Loader2 } from "lucide-react";
import { useTimer } from "@/lib/hooks/use-timer";
import { trackQuizComplete, trackQuizStarted, trackQuizQuestionAnswered, trackQuizTimedOut } from "@/lib/posthog/events";

export interface QuizData {
  quizId: string;
  totalProblems: number;
  timeLimitMs: number;
  expiresAt?: number;
  problems: Problem[];
}

interface QuizResult {
  quizId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  xpAwarded: number;
  failedConcepts: string[];
  conceptBreakdown: Array<{ conceptName: string; correct: number; total: number }>;
  results: Array<{ problemId: string; correct: boolean }>;
}

interface QuizFlowProps {
  orgSlug: string;
  courseId: string;
  token: string;
  quizData: QuizData;
  continueHref?: string;
}

export function QuizFlow({
  orgSlug,
  courseId,
  token,
  quizData,
  continueHref,
}: QuizFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const questionStartRef = useRef(0);
  const finishCalledRef = useRef(false);
  const answeredCountRef = useLatestRef(answeredCount);
  const [initialTimeMs] = useState(() => quizData.expiresAt !== undefined
    ? Math.max(0, quizData.expiresAt - Date.now())
    : quizData.timeLimitMs);

  const basePath = `/orgs/${orgSlug}/courses/${courseId}`;

  useMountEffect(() => {
    questionStartRef.current = Date.now(); trackQuizStarted(quizData.quizId, quizData.totalProblems, quizData.timeLimitMs); });
  const submission = useAnswerSubmission<{ body: string; index: number; responseTimeMs: number }, { answeredCount: number; totalProblems: number }>({
    send: (request) => apiClientFetch(`${basePath}/quizzes/${quizData.quizId}/answer`, token,
      { method: "POST", body: request.body }),
    onSuccess: (response, request) => {
      trackQuizQuestionAnswered(quizData.quizId, request.index, request.responseTimeMs);
      setAnsweredCount(response.answeredCount);
      answeredCountRef.current = response.answeredCount;
      if (request.index < quizData.problems.length - 1) {
        setCurrentIndex(request.index + 1);
        questionStartRef.current = Date.now();
      }
    },
    errorMessage: "Could not save your answer. Your selection is still here. Try again.",
  });
  const { submitting, pendingRequestRef: answerRequestRef } = submission;
  const error = completionError ? { kind: "completion", message: completionError }
    : submission.error ? { kind: "answer", message: submission.error } : null;

  const handleFinish = useCallback(async () => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;
    setFinishing(true);
    setCompletionError(null);
    try {
      // The server must receive the pending answer before it calculates a score.
      await answerRequestRef.current?.catch(() => undefined);
      const res = await apiClientFetch<QuizResult>(
        `${basePath}/quizzes/${quizData.quizId}/complete`,
        token,
        { method: "POST" }
      );
      setResult(res);
      trackQuizComplete(
        quizData.quizId,
        res.score >= 0.7,
        res.score,
      );
    } catch {
      finishCalledRef.current = false;
      setCompletionError("Could not load your quiz result. Retry completion to check your saved answers.");
    } finally {
      setFinishing(false);
    }
  }, [basePath, quizData.quizId, token, answerRequestRef]);

  const { remainingMs: timeLeftMs } = useTimer({
    timeLimitMs: initialTimeMs,
    onExpire: () => {
      if (finishCalledRef.current) return;
      trackQuizTimedOut(quizData.quizId, answeredCountRef.current, quizData.totalProblems);
      handleFinish();
    },
  });

  function formatTime(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  function handleSubmit(answer: ProblemAnswer) {
    if (answerRequestRef.current || finishCalledRef.current || result || timeLeftMs <= 0 || answeredCount >= quizData.totalProblems) return;
    const responseTimeMs = Date.now() - questionStartRef.current;
    setCompletionError(null);
    return submission.submit({
      body: JSON.stringify({ problemId: quizData.problems[currentIndex].id, answer, responseTimeMs }),
      index: currentIndex, responseTimeMs,
    });
  }

  // Results screen
  if (result) {
    return (
      <div className="mx-auto max-w-md text-center space-y-6 py-8">
        <h2 className="text-2xl font-bold text-foreground">Quiz Complete</h2>
        <p className="text-4xl font-bold text-primary">
          {Math.round(result.score * 100)}%
        </p>
        <p className="text-muted-foreground">
          {result.correctCount} of {result.totalCount} correct
          {result.xpAwarded > 0 && ` (+${result.xpAwarded} XP)`}
        </p>

        {result.conceptBreakdown.length > 0 && (
          <div className="text-left space-y-2">
            <p className="text-sm font-medium text-foreground">Per-concept breakdown:</p>
            {result.conceptBreakdown.map((cb) => (
              <div key={cb.conceptName} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{cb.conceptName}</span>
                <span className="text-muted-foreground">{cb.correct}/{cb.total}</span>
              </div>
            ))}
          </div>
        )}

        <Button render={<Link href={continueHref ?? `/study/${courseId}`} />}>
          Continue Studying
        </Button>
      </div>
    );
  }

  const problem = quizData.problems[currentIndex];
  const isLast = currentIndex === quizData.problems.length - 1;
  const isLastAnswered = answeredCount >= quizData.totalProblems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {quizData.totalProblems}
        </span>
        <span className={`flex items-center gap-1 text-sm font-medium ${timeLeftMs < 60000 ? "text-destructive" : "text-muted-foreground"}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeftMs)}
        </span>
      </div>

      <Progress value={((currentIndex + 1) / quizData.totalProblems) * 100} className="h-2" />

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
          {error.kind === "answer" && timeLeftMs > 0 && (
            <Button variant="outline" className="mt-3" disabled={submitting || finishing} onClick={() => {
              void submission.retry();
            }}>
              Retry answer
            </Button>
          )}
        </div>
      )}

      <ProblemRenderer
        key={problem.id}
        problem={problem}
        onSubmit={handleSubmit}
        disabled={submitting || finishing || isLastAnswered || timeLeftMs <= 0}
        loading={submitting}
      />

      {submitting ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="size-4 animate-spin" />
          Saving answer...
        </div>
      ) : null}

      {((isLast && isLastAnswered) || timeLeftMs <= 0 || error?.kind === "completion") && (
        <Button onClick={handleFinish} className="w-full" variant="default" disabled={submitting || finishing}>
          {finishing ? "Loading result..." : error?.kind === "completion" ? "Retry completion" : "Finish Quiz"}
        </Button>
      )}
    </div>
  );
}
