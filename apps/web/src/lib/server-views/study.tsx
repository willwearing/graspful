import 'server-only';
import { StudyRouter } from '@/components/app/study-router';
import { getLearnTaskHref } from '@/lib/learn-routes';
import type { ApiFetcher } from '@/lib/api';
import type { LearnerRoutes } from '@/lib/learner-routes';
import type { NextTask } from '@graspful/shared';

export async function StudyView({ orgSlug, courseId, courseSlug, fetcher, routes }: {
  orgSlug: string;
  courseId: string;
  courseSlug?: string;
  fetcher: ApiFetcher;
  routes: LearnerRoutes;
}) {
  let task: NextTask | null = null;
  let taskHref: string | null | undefined;
  let loadFailed = false;
  try {
    task = await fetcher<NextTask>(`/orgs/${orgSlug}/courses/${courseId}/next-task`);
    if (task && courseSlug) {
      let targetSlug: string | undefined = courseSlug;
      if (task.courseId && task.courseId !== courseId) {
        const courses = await fetcher<Array<{ id: string; slug: string }>>(`/orgs/${orgSlug}/courses`);
        targetSlug = courses.find((course) => course.id === task?.courseId)?.slug;
      }
      taskHref = targetSlug ? getLearnTaskHref(orgSlug, targetSlug, task) : null;
      if (!taskHref) loadFailed = true;
    }
  } catch {
    loadFailed = true;
  }
  return <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
    <StudyRouter courseId={courseId} task={task} taskHref={taskHref} loadFailed={loadFailed} emptyStateHref={routes.course} emptyStateLabel="Back to Course" />
  </div>;
}
