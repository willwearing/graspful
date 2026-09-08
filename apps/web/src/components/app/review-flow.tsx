"use client";

import { useState, useRef, useEffect } from "react";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer, type ProblemFeedback } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { trackReviewStarted, trackReviewProblemAnswered, trackReviewCompleted } from "@/lib/posthog/events";

export interface ReviewData {
  sessionId: string;
  totalProblems: number;
  problemNumber: number;
  currentProblem: Problem;
}

interface ReviewFlowProps {
  orgSlug: string;
  courseId: string;
  conceptId: string;
  token: string;
  initialData: ReviewData;
  continueHref?: string;
}

interface ReviewResult {
  conceptId: string;
  passed: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  updatedMasteryState: string;
}

interface ReviewAnswerResult {
  correct: boolean;
  feedback: string;
  hasMore: boolean;
  nextProblem?: Problem;
  problemNumber: number;
}

export function ReviewFlow({
  orgSlug,
  courseId,
  conceptId,
  token,
  initialData,
  continueHref,
}: ReviewFlowProps) {
  const [sessionId] = useState(initialData.sessionId);
  const [problem, setProblem] = useState<Problem>(initialData.currentProblem);
  const [problemNumber, setProblemNumber] = useState(initialData.problemNumber);
  const [totalProblems] = useState(initialData.totalProblems);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<ProblemFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [answersComplete, setAnswersComplete] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<{ kind: "answer" | "completion"; message: string } | null>(null);
  const startTimeRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestInFlightRef = useRef(false);
  const lastAnswerRef = useRef<ProblemAnswer | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  const basePath = `/orgs/${orgSlug}/courses/${courseId}`;

  // Track review start on mount
  useEffect(() => {
    trackReviewStarted(conceptId, initialData.totalProblems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComplete() {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setFinishing(true);
    setError(null);
    try {
      const completeResult = await apiClientFetch<ReviewResult>(
        `${basePath}/reviews/${conceptId}/complete`,
        token,
        { method: "POST", body: JSON.stringify({ sessionId }) },
      );
      if (!mountedRef.current) return;
      trackReviewCompleted(conceptId, completeResult.passed, completeResult.score);
      setResult(completeResult);
    } catch {
      if (mountedRef.current) {
        setError({ kind: "completion", message: "Could not load your review result. Retry completion to check your saved answers." });
      }
    } finally {
      requestInFlightRef.current = false;
      if (mountedRef.current) setFinishing(false);
    }
  }

  async function handleSubmit(answer: ProblemAnswer) {
    if (requestInFlightRef.current || submitting || feedback || answersComplete) return;
    requestInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    lastAnswerRef.current = answer;

    try {
      const response = await apiClientFetch<ReviewAnswerResult>(
        `${basePath}/reviews/${conceptId}/answer`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            problemId: problem.id,
            answer,
            responseTimeMs: Date.now() - startTimeRef.current,
          }),
        }
      );
      if (!mountedRef.current) return;
      requestInFlightRef.current = false;
      lastAnswerRef.current = null;

      const wasCorrect = response.correct;
      trackReviewProblemAnswered(
        conceptId,
        problem.id,
        wasCorrect,
        Date.now() - startTimeRef.current,
      );
      if (wasCorrect) setCorrectCount((prev) => prev + 1);
      setFeedback({ wasCorrect, explanation: response.feedback });
      if (!response.hasMore) setAnswersComplete(true);

      advanceTimeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;

        if (response.hasMore && response.nextProblem) {
          setFeedback(null);
          setProblem(response.nextProblem);
          setProblemNumber(response.problemNumber);
          startTimeRef.current = Date.now();
          setSubmitting(false);
        } else {
          setSubmitting(false);
          await handleComplete();
        }
      }, 1500);
    } catch {
      requestInFlightRef.current = false;
      setError({ kind: "answer", message: "Could not save your answer. Your selection is still here. Try again." });
      setSubmitting(false);
    }
  }

  // Completion screen
  if (result) {
    return (
      <div className="mx-auto max-w-md text-center space-y-6 py-8">
        {result.passed ? (
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        ) : (
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
        )}
        <h2 className="text-2xl font-bold text-foreground">
          {result.passed ? "Review Passed!" : "Review Not Passed"}
        </h2>
        <p className="text-muted-foreground">
          You got {result.correctCount} of {result.totalCount} correct ({Math.round(result.score * 100)}%).
        </p>
        <div className="flex gap-3 justify-center">
          {!result.passed && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          )}
          <Button render={<Link href={continueHref ?? `/study/${courseId}`} />}>
            Continue Studying
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = (problemNumber / totalProblems) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Problem {problemNumber} of {totalProblems}
        </span>
        <span className="text-sm text-muted-foreground">
          {correctCount} correct
        </span>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
          <Button variant="outline" className="mt-3" disabled={submitting || finishing} onClick={() => {
            if (error.kind === "completion") void handleComplete();
            else if (lastAnswerRef.current !== null) void handleSubmit(lastAnswerRef.current);
          }}>
            {error.kind === "completion" ? "Retry completion" : "Retry answer"}
          </Button>
        </div>
      )}

      <ProblemRenderer
        key={problem.id}
        problem={problem}
        onSubmit={handleSubmit}
        disabled={submitting || finishing || !!feedback || answersComplete}
        loading={submitting && !feedback}
        feedback={feedback ?? undefined}
      />
      {finishing && <p role="status" className="text-sm text-muted-foreground">Loading review result...</p>}
    </div>
  );
}
