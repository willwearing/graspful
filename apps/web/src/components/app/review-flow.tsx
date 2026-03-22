"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer, type ProblemFeedback } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { trackReviewStarted, trackReviewProblemAnswered, trackReviewCompleted } from "@/lib/posthog/events";

interface ReviewData {
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
}

interface ReviewResult {
  conceptId: string;
  passed: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  updatedMasteryState: string;
}

export function ReviewFlow({ orgSlug, courseId, conceptId, token, initialData }: ReviewFlowProps) {
  const router = useRouter();
  const [sessionId] = useState(initialData.sessionId);
  const [problem, setProblem] = useState<Problem>(initialData.currentProblem);
  const [problemNumber, setProblemNumber] = useState(initialData.problemNumber);
  const [totalProblems] = useState(initialData.totalProblems);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<ProblemFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false }, []);

  const basePath = `/orgs/${orgSlug}/courses/${courseId}`;

  // Track review start on mount
  useEffect(() => {
    trackReviewStarted(conceptId, initialData.totalProblems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(answer: ProblemAnswer) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await apiClientFetch<any>(
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

      const wasCorrect = response.correct;
      trackReviewProblemAnswered(
        conceptId,
        problem.id,
        wasCorrect,
        Date.now() - startTimeRef.current,
      );
      if (wasCorrect) setCorrectCount((prev) => prev + 1);
      setFeedback({ wasCorrect, explanation: response.feedback });

      setTimeout(async () => {
        if (!mountedRef.current) return;
        setFeedback(null);

        if (response.hasMore && response.nextProblem) {
          setProblem(response.nextProblem);
          setProblemNumber(response.problemNumber);
          startTimeRef.current = Date.now();
          setSubmitting(false);
        } else {
          // Complete the review
          try {
            const completeResult = await apiClientFetch<ReviewResult>(
              `${basePath}/reviews/${conceptId}/complete`,
              token,
              {
                method: "POST",
                body: JSON.stringify({ sessionId }),
              }
            );
            trackReviewCompleted(conceptId, completeResult.passed, completeResult.score);
            setResult(completeResult);
          } catch {
            // Still show what we have
            setResult({
              conceptId,
              passed: false,
              score: 0,
              correctCount,
              totalCount: totalProblems,
              updatedMasteryState: "in_progress",
            });
          }
          setSubmitting(false);
        }
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
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
          <Button render={<Link href={`/study/${courseId}`} />}>
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <ProblemRenderer
        key={problem.id}
        problem={problem}
        onSubmit={handleSubmit}
        disabled={submitting || !!feedback}
        feedback={feedback ?? undefined}
      />
    </div>
  );
}
