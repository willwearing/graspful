"use client";

import { useState, useRef } from "react";
import { useAnswerSubmission } from "@/lib/hooks/use-answer-submission";
import { usePracticeLoop } from "@/lib/hooks/use-practice-loop";
import { useMountEffect } from "@/lib/hooks/use-mount-effect";
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
  const [answersComplete, setAnswersComplete] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const startTimeRef = useRef(0);
  const { feedback, present } = usePracticeLoop<ProblemFeedback>();
  const basePath = `/orgs/${orgSlug}/courses/${courseId}`;

  useMountEffect(() => {
    startTimeRef.current = Date.now(); trackReviewStarted(conceptId, initialData.totalProblems); });

  const completion = useAnswerSubmission<void, ReviewResult>({
    send: () => apiClientFetch(`${basePath}/reviews/${conceptId}/complete`, token,
      { method: "POST", body: JSON.stringify({ sessionId }) }),
    onSuccess: (response) => {
      trackReviewCompleted(conceptId, response.passed, response.score);
      setResult(response);
    },
    errorMessage: "Could not load your review result. Retry completion to check your saved answers.",
  });
  const submission = useAnswerSubmission<{ body: string; problemId: string; responseTimeMs: number }, ReviewAnswerResult>({
    send: (request) => apiClientFetch(`${basePath}/reviews/${conceptId}/answer`, token,
      { method: "POST", body: request.body }),
    onSuccess: (response, request) => {
      trackReviewProblemAnswered(conceptId, request.problemId, response.correct, request.responseTimeMs);
      if (response.correct) setCorrectCount((previous) => previous + 1);
      if (!response.hasMore) setAnswersComplete(true);
      return present({ wasCorrect: response.correct, explanation: response.feedback }, async () => {
        if (response.hasMore && response.nextProblem) {
          setProblem(response.nextProblem);
          setProblemNumber(response.problemNumber);
          startTimeRef.current = Date.now();
        } else {
          await completion.submit();
        }
      });
    },
    errorMessage: "Could not save your answer. Your selection is still here. Try again.",
  });
  const submitting = submission.submitting;
  const finishing = completion.submitting;
  const error = completion.error
    ? { kind: "completion" as const, message: completion.error }
    : submission.error ? { kind: "answer" as const, message: submission.error } : null;

  function handleSubmit(answer: ProblemAnswer) {
    if (submission.pendingRequestRef.current || completion.pendingRequestRef.current || feedback || answersComplete) return;
    const responseTimeMs = Date.now() - startTimeRef.current;
    return submission.submit({
      body: JSON.stringify({ sessionId, problemId: problem.id, answer, responseTimeMs }),
      problemId: problem.id, responseTimeMs,
    });
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
            if (error.kind === "completion") void completion.retry();
            else void submission.retry();
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
