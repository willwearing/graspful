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
  let taskHref: string | null = null;
  let loadFailed = false;
  try {
    task = await serverApiFetch<NextTask>(`/orgs/${orgSlug}/courses/${course.id}/next-task`);
    if (task) {
      let targetCourseSlug: string | undefined = courseSlug;
      // Course study uses the academy scheduler, which may select another course.
      if (task.courseId && task.courseId !== course.id) {
        const courses = await serverApiFetch<Array<{ id: string; slug: string }>>(`/orgs/${orgSlug}/courses`);
        targetCourseSlug = courses.find((candidate) => candidate.id === task?.courseId)?.slug;
      }
      taskHref = targetCourseSlug ? getLearnTaskHref(orgSlug, targetCourseSlug, task) : null;
    }
  } catch {
    loadFailed = true;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter
        courseId={course.id}
        task={task}
        taskHref={taskHref}
        loadFailed={loadFailed}
        emptyStateHref={getLearnCourseHref(orgSlug, courseSlug)}
        emptyStateLabel="Back to Course"
      />
    </div>
  );
}
