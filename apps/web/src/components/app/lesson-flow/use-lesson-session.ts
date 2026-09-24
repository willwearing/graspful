"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";
import { useAnswerSubmission } from "@/lib/hooks/use-answer-submission";
import { useLatestRef } from "@/lib/hooks/use-latest-ref";
import { useMountEffect } from "@/lib/hooks/use-mount-effect";
import { trackLessonAbandoned, trackLessonComplete, trackLessonStarted } from "@/lib/posthog/events";
import type { LessonFlowProps } from "./types";
import type { useLessonProgress } from "./use-lesson-progress";

export function useLessonSession(props: LessonFlowProps, progress: ReturnType<typeof useLessonProgress>) {
  const { orgSlug, courseId, token, lesson, continueHref } = props;
  const router = useRouter();
  const startRef = useRef(0);
  const completedRef = useRef(false);
  const progressRef = useLatestRef(progress);
  useMountEffect(() => {
    startRef.current = Date.now();
    trackLessonStarted(courseId, lesson.conceptId, lesson.conceptName, lesson.knowledgePoints.length);
    return () => {
      if (!completedRef.current) {
        const current = progressRef.current;
        trackLessonAbandoned(courseId, lesson.conceptId, lesson.conceptName,
          current.currentKP + 1, lesson.knowledgePoints.length, current.phase,
          Math.round((Date.now() - startRef.current) / 1000));
      }
    };
  });
  const submission = useAnswerSubmission<void, unknown>({
    send: () => apiClientFetch(`/orgs/${orgSlug}/courses/${courseId}/lessons/${lesson.conceptId}/complete`, token, { method: "POST" }),
    onSuccess: () => {
      trackLessonComplete(lesson.conceptId, lesson.conceptName, Math.round((Date.now() - startRef.current) / 1000));
      completedRef.current = true;
      router.push(continueHref ?? `/study/${courseId}`);
    },
    errorMessage: "Could not save lesson completion. Try again to check your progress.",
  });
  function complete() {
    if (!completedRef.current) return submission.submit();
  }
  return { complete, completing: submission.submitting, error: submission.error };
}
