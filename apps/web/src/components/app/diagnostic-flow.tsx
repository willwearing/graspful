"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer, type ProblemFeedback } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";

interface DiagnosticState {
  sessionId: string;
  questionNumber: number;
  totalEstimated: number;
  isComplete: boolean;
  question: Problem | null;
}

interface DiagnosticResult {
  totalConcepts: number;
  questionsAnswered: number;
  breakdown: {
    mastered: number;
    conditionally_mastered: number;
    partially_known: number;
    unknown: number;
  };
  conceptDetails: Array<{ conceptName: string; category: string }>;
}

interface DiagnosticFlowProps {
  orgId: string;
  courseId: string;
  token: string;
  initialData: DiagnosticState;
}

export function DiagnosticFlow({ orgId, courseId, token, initialData }: DiagnosticFlowProps) {
  const router = useRouter();
  const [state, setState] = useState<DiagnosticState>(initialData);
  const [feedback, setFeedback] = useState<ProblemFeedback | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  const basePath = `/orgs/${orgId}/courses/${courseId}`;

  // Fetch result when complete
  const fetchResult = useCallback(async (sessionId: string) => {
    const res = await apiClientFetch<DiagnosticResult>(
      `${basePath}/diagnostic/result/${sessionId}`,
      token
    );
    setResult(res);
  }, [basePath, token]);

  // If initially complete, fetch result
  if (state.isComplete && !result) {
    fetchResult(state.sessionId);
  }

  async function handleSubmit(answer: ProblemAnswer) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await apiClientFetch<any>(
        `${basePath}/diagnostic/answer`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: state.sessionId,
            answer,
            responseTimeMs: Date.now() - startTime,
          }),
        }
      );

      setFeedback({ wasCorrect: response.wasCorrect });

      // After brief delay, show next question or complete
      setTimeout(() => {
        setFeedback(null);
        if (response.isComplete) {
          setState((prev) => ({ ...prev, isComplete: true }));
          fetchResult(state.sessionId);
        } else {
          setState({
            sessionId: response.sessionId,
            questionNumber: response.questionNumber,
            totalEstimated: state.totalEstimated,
            isComplete: false,
            question: response.question,
          });
        }
        setSubmitting(false);
      }, 1500);
    } catch {
      setSubmitting(false);
    }
  }

  // Completion screen
  if (state.isComplete || result) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">Diagnostic Complete</h2>

        {result ? (
          <>
            <p className="text-muted-foreground">
              You answered {result.questionsAnswered} questions across {result.totalConcepts} concepts.
            </p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.breakdown.mastered}</p>
                <p className="text-xs text-muted-foreground">Mastered</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-2xl font-bold text-primary">{result.breakdown.conditionally_mastered}</p>
                <p className="text-xs text-muted-foreground">Mostly Known</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.breakdown.partially_known}</p>
                <p className="text-xs text-muted-foreground">Partially Known</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-2xl font-bold text-muted-foreground">{result.breakdown.unknown}</p>
                <p className="text-xs text-muted-foreground">New to You</p>
              </div>
            </div>

            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Go to Dashboard
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">Loading results...</p>
        )}
      </div>
    );
  }

  // Question flow
  const progressPercent = (state.questionNumber / state.totalEstimated) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {state.questionNumber} of ~{state.totalEstimated}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={Math.min(progressPercent, 100)} className="h-2" />
      </div>

      {state.question && (
        <ProblemRenderer
          problem={state.question}
          onSubmit={handleSubmit}
          disabled={submitting || !!feedback}
          feedback={feedback ?? undefined}
        />
      )}

      {feedback && (
        <p className="text-sm text-muted-foreground text-center">Loading next question...</p>
      )}
    </div>
  );
}
