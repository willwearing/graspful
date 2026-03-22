"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer, type ProblemFeedback } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import { trackDiagnosticComplete, trackDiagnosticStarted, trackDiagnosticQuestionAnswered } from "@/lib/posthog/events";

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
  orgSlug: string;
  courseId: string;
  academyId?: string;
  token: string;
  initialData: DiagnosticState;
}

export function DiagnosticFlow({ orgSlug, courseId, academyId, token, initialData }: DiagnosticFlowProps) {
  const router = useRouter();
  const [state, setState] = useState<DiagnosticState>(initialData);
  const [feedback, setFeedback] = useState<ProblemFeedback | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const fetchingRef = useRef(false);

  const diagnosticBasePath = academyId
    ? `/orgs/${orgSlug}/academies/${academyId}/diagnostic`
    : `/orgs/${orgSlug}/courses/${courseId}/diagnostic`;

  // Fetch result when complete
  const fetchResult = useCallback(async (sessionId: string) => {
    const res = await apiClientFetch<DiagnosticResult>(
      `${diagnosticBasePath}/result/${sessionId}`,
      token
    );
    setResult(res);
    trackDiagnosticComplete(
      courseId,
      res.breakdown.mastered + res.breakdown.conditionally_mastered,
      res.totalConcepts,
    );
  }, [diagnosticBasePath, token, courseId]);

  // Track diagnostic start
  useEffect(() => {
    trackDiagnosticStarted(courseId, initialData.totalEstimated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If initially complete, fetch result
  useEffect(() => {
    if (state.isComplete && !result && !fetchingRef.current) {
      fetchingRef.current = true;
      fetchResult(state.sessionId).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, [state.isComplete, state.sessionId, result, fetchResult]);

  async function handleSubmit(answer: ProblemAnswer) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiClientFetch<any>(
        `${diagnosticBasePath}/answer`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: state.sessionId,
            answer,
            responseTimeMs: Date.now() - startTimeRef.current,
          }),
        }
      );

      const skipped = answer === "__I_DONT_KNOW__";
      trackDiagnosticQuestionAnswered(
        courseId,
        state.questionNumber,
        response.wasCorrect,
        skipped,
        Date.now() - startTimeRef.current,
      );
      setFeedback({ wasCorrect: response.wasCorrect, skipped });

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
          startTimeRef.current = Date.now();
        }
        setSubmitting(false);
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
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

            <Button onClick={() => router.push(academyId ? `/academy/${academyId}` : "/dashboard")} className="mt-4">
              {academyId ? "Go to Academy" : "Go to Dashboard"}
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

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        This diagnostic is adaptive, so questions may jump between topics and sections.
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
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
