import posthog from "posthog-js";

function isLoaded(): boolean {
  return typeof window !== "undefined" && posthog.__loaded;
}

export function trackSignUp(userId: string) {
  if (!isLoaded()) return;
  posthog.identify(userId);
  posthog.capture("sign_up", { method: "email" });
}

export function captureError(message: string, source?: string) {
  if (!isLoaded()) return;
  posthog.capture("$exception", {
    message,
    ...(source ? { source } : {}),
  });
}

export function trackEnrollment(courseId: string, courseName: string) {
  if (!isLoaded()) return;
  posthog.capture("course_enrolled", {
    course_id: courseId,
    course_name: courseName,
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

export function trackSubscription(plan: string, billingPeriod: string) {
  if (!isLoaded()) return;
  posthog.capture("subscription_started", {
    plan,
    billing_period: billingPeriod,
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
