import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { requireLearnSession, resolveCourseBySlug } from "@/lib/learn-server";
import { getLearnCourseHref, getLearnCourseStudyHref } from "@/lib/learn-routes";
import { LessonFlow } from "@/components/app/lesson-flow";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string; conceptId: string }>;
}) {
  const { orgSlug, courseSlug, conceptId } = await params;
  const { token } = await requireLearnSession();
  const course = await resolveCourseBySlug(orgSlug, courseSlug);

  let lesson: any = null;
  let errorMessage: string | null = null;
  try {
    lesson = await apiFetch<any>(`/orgs/${orgSlug}/courses/${course.id}/lessons/${conceptId}/start`, {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 400) {
      errorMessage = err.message.includes("blocked")
        ? "This concept is blocked by a prerequisite. Complete the required reviews first."
        : err.message.includes("mastered")
          ? "You've already mastered this concept."
          : "Cannot start this lesson right now.";
    } else if (err instanceof ApiError && err.statusCode === 404) {
      errorMessage = "Lesson not found. You may need to complete the diagnostic first.";
    } else {
      errorMessage = "Something went wrong loading the lesson. Please try again.";
    }
  }

  if (errorMessage || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <Link
          href={getLearnCourseHref(orgSlug, courseSlug)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Lesson Unavailable</h2>
          <p className="text-muted-foreground">{errorMessage ?? "Could not load the lesson."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <LessonFlow
        orgSlug={orgSlug}
        courseId={course.id}
        token={token}
        lesson={lesson}
        continueHref={getLearnCourseStudyHref(orgSlug, courseSlug)}
      />
    </div>
  );
}
