"use client";

import { useRef } from "react";
import { apiClientFetch } from "@/lib/api-client";
import { useMountEffect } from "@/lib/hooks/use-mount-effect";
import { useAnswerSubmission } from "@/lib/hooks/use-answer-submission";
import { usePracticeLoop } from "@/lib/hooks/use-practice-loop";
import { trackLessonPracticeAnswered } from "@/lib/posthog/events";
import type { ProblemFeedback } from "@/components/app/problems/problem-renderer";
import type { ProblemAnswer } from "@/lib/types";
import type { LessonFlowProps, NextProblemHint } from "./types";
import type { useLessonProgress } from "./use-lesson-progress";

interface PracticeSubmission {
  body: string;
  problemId: string;
  responseTimeMs: number;
}
interface PracticeResponse {
  correct: boolean;
  feedback: string;
  nextProblemHint: NextProblemHint | null;
}

export function useLessonPractice(
  { orgSlug, courseId, token, lesson }: LessonFlowProps,
  progress: ReturnType<typeof useLessonProgress>,
) {
  const startRef = useRef(0);
  useMountEffect(() => { startRef.current = Date.now(); });
  const seenProblemIdsRef = useRef<string[]>([]);
  const loop = usePracticeLoop<ProblemFeedback>();
  const submission = useAnswerSubmission<PracticeSubmission, PracticeResponse>({
    send: (request) => apiClientFetch(
      `/orgs/${orgSlug}/courses/${courseId}/lessons/${lesson.conceptId}/answer`,
      token, { method: "POST", body: request.body },
    ),
    onSuccess: (response, request) => {
      trackLessonPracticeAnswered(lesson.conceptId, request.problemId, response.correct, request.responseTimeMs);
      return loop.present({ wasCorrect: response.correct, explanation: response.feedback }, () => {
        progress.applyNextProblemHint(response.nextProblemHint ?? null);
        startRef.current = Date.now();
      }, response.nextProblemHint?.retryDelayMs);
    },
    errorMessage: "Could not confirm your answer was saved. Retry to check the same answer.",
  });

  function submit(answer: ProblemAnswer) {
    const problem = progress.currentProblem;
    if (!problem || submission.pendingRequestRef.current || submission.error || loop.feedback) return;
    if (!seenProblemIdsRef.current.includes(problem.id)) seenProblemIdsRef.current.push(problem.id);
    const responseTimeMs = Math.max(1, Date.now() - startRef.current);
    return submission.submit({
      problemId: problem.id,
      responseTimeMs,
      body: JSON.stringify({
        requestId: crypto.randomUUID(), problemId: problem.id, answer, responseTimeMs,
        seenProblemIds: seenProblemIdsRef.current,
        workedExampleReopenedKPIds: progress.reopenedKPIdsRef.current,
      }),
    });
  }

  function reset() {
    loop.reset();
    submission.clearError();
    startRef.current = Date.now();
  }

  return { ...submission, ...loop, submit, reset };
}
