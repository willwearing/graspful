"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import { useTimer } from "@/lib/hooks/use-timer";
import { trackSectionExamStarted, trackSectionExamQuestionAnswered, trackSectionExamCompleted } from "@/lib/posthog/events";

interface SectionExamData {
  sessionId: string;
  totalProblems: number;
  timeLimitMs: number;
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
}

export function SectionExamFlow({
  orgSlug,
  courseId,
  sectionId,
  token,
  examData,
}: SectionExamFlowProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SectionExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const questionStartRef = useRef(Date.now());
  const finishCalledRef = useRef(false);

  const basePath = `/orgs/${orgSlug}/courses/${courseId}/sections/${sectionId}/exam`;

  // Track exam start
  useEffect(() => {
    trackSectionExamStarted(sectionId, examData.totalProblems, examData.timeLimitMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFinish() {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;

    try {
      const response = await apiClientFetch<SectionExamResult>(
        `${basePath}/${examData.sessionId}/complete`,
        token,
        { method: "POST" }
      );
      trackSectionExamCompleted(sectionId, response.passed, response.score);
      setResult(response);
    } catch {
      setError("Could not complete the section exam.");
    }
  }

  const { remainingMs: timeLeftMs } = useTimer({
    timeLimitMs: examData.timeLimitMs,
    onExpire: () => { void handleFinish(); },
  });

  function formatTime(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleSubmit(answer: ProblemAnswer) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await apiClientFetch<{ answeredCount: number; totalProblems: number }>(
        `${basePath}/${examData.sessionId}/answer`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            problemId: examData.problems[currentIndex].id,
            answer,
            responseTimeMs: Date.now() - questionStartRef.current,
          }),
        }
      );

      trackSectionExamQuestionAnswered(
        sectionId,
        currentIndex,
        Date.now() - questionStartRef.current,
      );
      setAnsweredCount(response.answeredCount);
      if (currentIndex < examData.problems.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        questionStartRef.current = Date.now();
      }
    } catch {
      setError("Could not save your answer. Try again.");
    }

    setSubmitting(false);
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="text-center space-y-2">
          <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${result.passed ? "text-emerald-600" : "text-amber-700"}`}>
            {result.passed ? "Certified" : "Needs Review"}
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
          <Button className="flex-1" render={<Link href={`/browse/${courseId}`} />}>
            Back to Course
          </Button>
          <Button
            className="flex-1"
            variant={result.passed ? "default" : "secondary"}
            onClick={() => router.push(`/study/${courseId}`)}
          >
            {result.passed ? "Continue Studying" : "Start Review"}
          </Button>
        </div>
      </div>
    );
  }

  const problem = examData.problems[currentIndex];
  const isLast = currentIndex === examData.problems.length - 1;
  const isLastAnswered = answeredCount >= examData.totalProblems;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Section exam
        </p>
        <h1 className="text-2xl font-bold text-foreground">Show what you can do without scaffolding</h1>
        {examData.instructions ? (
          <p className="text-sm text-muted-foreground">{examData.instructions}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {examData.totalProblems}
        </span>
        <span className={`flex items-center gap-1 text-sm font-medium ${timeLeftMs < 60000 ? "text-destructive" : "text-muted-foreground"}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeftMs)}
        </span>
      </div>

      <Progress value={((currentIndex + 1) / examData.totalProblems) * 100} className="h-2" />

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <ProblemRenderer
        key={problem.id}
        problem={problem}
        onSubmit={handleSubmit}
        disabled={submitting}
      />

      {isLast && isLastAnswered ? (
        <Button onClick={() => void handleFinish()} className="w-full">
          Finish Section Exam
        </Button>
      ) : null}
    </div>
  );
}
