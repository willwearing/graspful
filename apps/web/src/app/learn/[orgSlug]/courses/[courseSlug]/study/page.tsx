import { apiFetch } from "@/lib/api";
import { requireLearnAccess, resolveCourseBySlug } from "@/lib/learn-server";
import {
  getLearnCourseHref,
  getLearnTaskHref,
} from "@/lib/learn-routes";
import { StudyRouter } from "@/components/app/study-router";
import type { NextTask } from "@/lib/types";

export default async function LearnCourseStudyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string }>;
}) {
  const { orgSlug, courseSlug } = await params;
  const { serverApiFetch } = await requireLearnAccess(orgSlug);

  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);

  let task: NextTask | null = null;
  try {
    task = await apiFetch<NextTask>(`/orgs/${orgSlug}/courses/${course.id}/next-task`);
  } catch {
    // No task available.
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter
        courseId={course.id}
        task={task}
        resolveTaskHref={(_courseId, nextTask) => getLearnTaskHref(orgSlug, courseSlug, nextTask)}
        emptyStateHref={getLearnCourseHref(orgSlug, courseSlug)}
        emptyStateLabel="Back to Course"
      />
    </div>
  );
}
