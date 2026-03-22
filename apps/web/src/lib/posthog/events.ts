import posthog from "posthog-js";

function isLoaded(): boolean {
  return typeof window !== "undefined" && posthog.__loaded;
}

// ── Auth ──────────────────────────────────────────────────────────────

export function trackSignUp(userId: string) {
  if (!isLoaded()) return;
  posthog.identify(userId);
  posthog.capture("sign_up", { method: "email" });
}

export function trackSignIn(userId: string) {
  if (!isLoaded()) return;
  posthog.identify(userId);
  posthog.capture("sign_in", { method: "email" });
}

// ── Errors ────────────────────────────────────────────────────────────

export function captureError(message: string, source?: string) {
  if (!isLoaded()) return;
  posthog.capture("$exception", {
    message,
    ...(source ? { source } : {}),
  });
}

// ── Course & Enrollment ───────────────────────────────────────────────

export function trackEnrollment(courseId: string, courseName: string) {
  if (!isLoaded()) return;
  posthog.capture("course_enrolled", {
    course_id: courseId,
    course_name: courseName,
  });
}

export function trackSubscription(plan: string, billingPeriod: string) {
  if (!isLoaded()) return;
  posthog.capture("subscription_started", {
    plan,
    billing_period: billingPeriod,
  });
}

// ── Diagnostic ────────────────────────────────────────────────────────

export function trackDiagnosticStarted(
  courseId: string,
  totalEstimated: number,
) {
  if (!isLoaded()) return;
  posthog.capture("diagnostic_started", {
    course_id: courseId,
    total_estimated: totalEstimated,
  });
}

export function trackDiagnosticQuestionAnswered(
  courseId: string,
  questionNumber: number,
  wasCorrect: boolean,
  wasSkipped: boolean,
  responseTimeMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("diagnostic_question_answered", {
    course_id: courseId,
    question_number: questionNumber,
    was_correct: wasCorrect,
    was_skipped: wasSkipped,
    response_time_ms: responseTimeMs,
  });
}

export function trackDiagnosticComplete(
  courseId: string,
  conceptsKnown: number,
  totalConcepts: number,
) {
  if (!isLoaded()) return;
  posthog.capture("diagnostic_completed", {
    course_id: courseId,
    concepts_known: conceptsKnown,
    total_concepts: totalConcepts,
  });
}

// ── Lesson ────────────────────────────────────────────────────────────

export function trackLessonStarted(
  courseId: string,
  conceptId: string,
  conceptName: string,
  totalKPs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("lesson_started", {
    course_id: courseId,
    concept_id: conceptId,
    concept_name: conceptName,
    total_knowledge_points: totalKPs,
  });
}

export function trackLessonPracticeAnswered(
  conceptId: string,
  problemId: string,
  wasCorrect: boolean,
  responseTimeMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("lesson_practice_answered", {
    concept_id: conceptId,
    problem_id: problemId,
    was_correct: wasCorrect,
    response_time_ms: responseTimeMs,
  });
}

export function trackLessonAudioPlayed(conceptId: string, kpSlug: string) {
  if (!isLoaded()) return;
  posthog.capture("lesson_audio_played", {
    concept_id: conceptId,
    kp_slug: kpSlug,
  });
}

export function trackLessonComplete(
  conceptId: string,
  conceptName: string,
  durationSeconds: number,
) {
  if (!isLoaded()) return;
  posthog.capture("lesson_completed", {
    concept_id: conceptId,
    concept_name: conceptName,
    duration_seconds: durationSeconds,
  });
}

// ── Quiz ──────────────────────────────────────────────────────────────

export function trackQuizStarted(
  quizId: string,
  totalProblems: number,
  timeLimitMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("quiz_started", {
    quiz_id: quizId,
    total_problems: totalProblems,
    time_limit_ms: timeLimitMs,
  });
}

export function trackQuizQuestionAnswered(
  quizId: string,
  questionIndex: number,
  responseTimeMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("quiz_question_answered", {
    quiz_id: quizId,
    question_index: questionIndex,
    response_time_ms: responseTimeMs,
  });
}

export function trackQuizComplete(
  conceptId: string,
  passed: boolean,
  score: number,
) {
  if (!isLoaded()) return;
  posthog.capture("quiz_completed", {
    concept_id: conceptId,
    passed,
    score,
  });
}

// ── Review ────────────────────────────────────────────────────────────

export function trackReviewStarted(
  conceptId: string,
  totalProblems: number,
) {
  if (!isLoaded()) return;
  posthog.capture("review_started", {
    concept_id: conceptId,
    total_problems: totalProblems,
  });
}

export function trackReviewProblemAnswered(
  conceptId: string,
  problemId: string,
  wasCorrect: boolean,
  responseTimeMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("review_problem_answered", {
    concept_id: conceptId,
    problem_id: problemId,
    was_correct: wasCorrect,
    response_time_ms: responseTimeMs,
  });
}

export function trackReviewCompleted(
  conceptId: string,
  passed: boolean,
  score: number,
) {
  if (!isLoaded()) return;
  posthog.capture("review_completed", {
    concept_id: conceptId,
    passed,
    score,
  });
}

// ── Section Exam ──────────────────────────────────────────────────────

export function trackSectionExamStarted(
  sectionId: string,
  totalProblems: number,
  timeLimitMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("section_exam_started", {
    section_id: sectionId,
    total_problems: totalProblems,
    time_limit_ms: timeLimitMs,
  });
}

export function trackSectionExamQuestionAnswered(
  sectionId: string,
  questionIndex: number,
  responseTimeMs: number,
) {
  if (!isLoaded()) return;
  posthog.capture("section_exam_question_answered", {
    section_id: sectionId,
    question_index: questionIndex,
    response_time_ms: responseTimeMs,
  });
}

export function trackSectionExamCompleted(
  sectionId: string,
  passed: boolean,
  score: number,
) {
  if (!isLoaded()) return;
  posthog.capture("section_exam_completed", {
    section_id: sectionId,
    passed,
    score,
  });
}

// ── Navigation ────────────────────────────────────────────────────────

export function trackStudyTaskDispatched(
  courseId: string,
  taskType: string,
) {
  if (!isLoaded()) return;
  posthog.capture("study_task_dispatched", {
    course_id: courseId,
    task_type: taskType,
  });
}
