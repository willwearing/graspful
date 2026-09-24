"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAnswerSubmission } from "@/lib/hooks/use-answer-submission";
import { usePracticeLoop } from "@/lib/hooks/use-practice-loop";
import { useLatestRef } from "@/lib/hooks/use-latest-ref";
import { useMountEffect } from "@/lib/hooks/use-mount-effect";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer, type ProblemFeedback } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProblemAnswer } from "@/lib/types";
import type { DiagnosticStart } from "@graspful/shared";
import { trackDiagnosticComplete, trackDiagnosticStarted, trackDiagnosticQuestionAnswered, trackDiagnosticAbandoned } from "@/lib/posthog/events";

type DiagnosticState = Omit<DiagnosticStart, "courseId">;

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
  orgSlug: string;
  courseId: string;
  academyId?: string;
  token: string;
  initialData: DiagnosticState;
  completionHref?: string;
  completionLabel?: string;
}

export function DiagnosticFlow({
  orgSlug,
  courseId,
  academyId,
  token,
  initialData,
  completionHref,
  completionLabel,
}: DiagnosticFlowProps) {
  const router = useRouter();
  const [state, setState] = useState<DiagnosticState>(initialData);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const startTimeRef = useRef(0);
  const stateRef = useLatestRef(state);
  const resultRef = useLatestRef(result);
  const { feedback, present } = usePracticeLoop<ProblemFeedback>();
  const diagnosticBasePath = academyId
    ? `/orgs/${orgSlug}/academies/${academyId}/diagnostic`
    : `/orgs/${orgSlug}/courses/${courseId}/diagnostic`;

  const completion = useAnswerSubmission<string, DiagnosticResult>({
    send: (sessionId) => apiClientFetch(`${diagnosticBasePath}/result/${sessionId}`, token),
    onSuccess: (response) => {
      setResult(response);
      trackDiagnosticComplete(courseId, response.breakdown.mastered + response.breakdown.conditionally_mastered, response.totalConcepts);
    },
    errorMessage: "Could not load your diagnostic result. Try again.",
  });
  const { submit: fetchResult } = completion;

  useMountEffect(() => {
    startTimeRef.current = Date.now();
    trackDiagnosticStarted(courseId, initialData.totalEstimated);
    return () => {
      if (!stateRef.current.isComplete && !resultRef.current) {
        trackDiagnosticAbandoned(courseId, stateRef.current.questionNumber, stateRef.current.totalEstimated);
      }
    };
  });

  useEffect(() => {
    if (state.isComplete && !result) void fetchResult(state.sessionId);
  }, [state.isComplete, state.sessionId, result, fetchResult]);

  const submission = useAnswerSubmission<{
    body: string; questionNumber: number; responseTimeMs: number; skipped: boolean;
  }, Omit<DiagnosticState, "totalEstimated"> & { wasCorrect: boolean }>({
    send: (request) => apiClientFetch(`${diagnosticBasePath}/answer`, token, { method: "POST", body: request.body }),
    onSuccess: (response, request) => {
      trackDiagnosticQuestionAnswered(courseId, request.questionNumber, response.wasCorrect, request.skipped, request.responseTimeMs);
      return present({ wasCorrect: response.wasCorrect, skipped: request.skipped }, () => {
        setState((previous) => ({ ...previous, sessionId: response.sessionId ?? previous.sessionId,
          questionNumber: response.questionNumber ?? previous.questionNumber,
          isComplete: response.isComplete, question: response.question ?? null }));
        startTimeRef.current = Date.now();
      });
    },
    errorMessage: "Something went wrong. Please try again.",
  });
  const { submitting, error } = submission;

  function handleSubmit(answer: ProblemAnswer) {
    if (submitting || feedback || state.isComplete) return;
    const responseTimeMs = Date.now() - startTimeRef.current;
    return submission.submit({
      body: JSON.stringify({ sessionId: state.sessionId, answer, responseTimeMs }),
      questionNumber: state.questionNumber, responseTimeMs, skipped: answer === "__I_DONT_KNOW__",
    });
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

            <Button
              onClick={() => router.push(completionHref ?? (academyId ? `/academy/${academyId}` : "/dashboard"))}
              className="mt-4"
            >
              {completionLabel ?? (academyId ? "Go to Academy" : "Go to Dashboard")}
            </Button>
          </>
        ) : (
          completion.error ? (
            <div role="alert" className="text-destructive">
              <p>{completion.error}</p>
              <Button onClick={() => void completion.retry()} disabled={completion.submitting}>Retry result</Button>
            </div>
          ) : <p className="text-muted-foreground">Loading results...</p>
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

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        This diagnostic is adaptive, so questions may jump between topics and sections.
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button onClick={submission.clearError} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {state.question && (
        <ProblemRenderer
          key={state.question.id}
          problem={state.question}
          onSubmit={handleSubmit}
          disabled={submitting || !!feedback}
          loading={submitting && !feedback}
          feedback={feedback ?? undefined}
        />
      )}

      {state.question && !feedback && (
        <button
          onClick={() => handleSubmit("__I_DONT_KNOW__")}
          disabled={submitting}
          className="mx-auto flex items-center gap-2 py-2 px-6 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border rounded-md transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          I don't know this yet
        </button>
      )}

      {feedback && (
        <p className="text-sm text-muted-foreground text-center">Loading next question...</p>
      )}

      {!feedback && (
        <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Don't guess — if you're not sure, tap <span className="font-medium text-foreground">"I don't know this yet"</span>
          </p>
        </div>
      )}
    </div>
  );
}
