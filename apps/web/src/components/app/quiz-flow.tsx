"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { ProblemRenderer } from "@/components/app/problems/problem-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Problem, ProblemAnswer } from "@/lib/types";
import Link from "next/link";
import { Clock } from "lucide-react";
import { trackQuizComplete, trackQuizStarted, trackQuizQuestionAnswered } from "@/lib/posthog/events";

interface QuizData {
  quizId: string;
  totalProblems: number;
  timeLimitMs: number;
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
}

export function QuizFlow({ orgSlug, courseId, token, quizData }: QuizFlowProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(quizData.timeLimitMs);
  const [error, setError] = useState<string | null>(null);
  const timerStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const finishCalledRef = useRef(false);

  const basePath = `/orgs/${orgSlug}/courses/${courseId}`;

  // Track quiz start
  useEffect(() => {
    trackQuizStarted(quizData.quizId, quizData.totalProblems, quizData.timeLimitMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinish = useCallback(async () => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;
    try {
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
      setError("Something went wrong. Please try again.");
      // Show minimal result
      setResult({
        quizId: quizData.quizId,
        score: 0,
        correctCount: 0,
        totalCount: quizData.totalProblems,
        xpAwarded: 0,
        failedConcepts: [],
        conceptBreakdown: [],
        results: [],
      });
    }
  }, [basePath, quizData.quizId, quizData.totalProblems, token]);

  // Timer
  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const remaining = Math.max(0, quizData.timeLimitMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (!finishCalledRef.current) {
          finishCalledRef.current = true;
          handleFinish();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [result, quizData.timeLimitMs, handleFinish]);

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
        `${basePath}/quizzes/${quizData.quizId}/answer`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            problemId: quizData.problems[currentIndex].id,
            answer,
            responseTimeMs: Date.now() - questionStartRef.current,
          }),
        }
      );

      trackQuizQuestionAnswered(
        quizData.quizId,
        currentIndex,
        Date.now() - questionStartRef.current,
      );
      setAnsweredCount(response.answeredCount);

      // Move to next or stay on last
      if (currentIndex < quizData.problems.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        questionStartRef.current = Date.now();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
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

        <Button render={<Link href={`/study/${courseId}`} />}>
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <ProblemRenderer
        key={problem.id}
        problem={problem}
        onSubmit={handleSubmit}
        disabled={submitting}
      />

      {isLast && isLastAnswered && (
        <Button onClick={handleFinish} className="w-full" variant="default">
          Finish Quiz
        </Button>
      )}
    </div>
  );
}
