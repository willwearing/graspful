import { requireLearnAccess, resolveAcademyBySlug } from "@/lib/learn-server";
import { getLearnAcademyHref, getLearnTaskHref } from "@/lib/learn-routes";
import { StudyRouter } from "@/components/app/study-router";
import type { NextTask } from "@/lib/types";

export default async function LearnAcademyStudyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; academySlug: string }>;
}) {
  const { orgSlug, academySlug } = await params;
  const { serverApiFetch } = await requireLearnAccess(orgSlug);

  const academy = await resolveAcademyBySlug(orgSlug, academySlug, serverApiFetch);
  let task: NextTask | null = null;
  let taskHref: string | null = null;
  let loadFailed = false;
  try {
    task = await serverApiFetch<NextTask>(`/orgs/${orgSlug}/academies/${academy.id}/next-task`);
    if (task) {
      const courses = await serverApiFetch<Array<{ id: string; slug: string }>>(
        `/orgs/${orgSlug}/academies/${academy.id}/courses`,
      );
      const course = courses.find((candidate) => candidate.id === task?.courseId);
      taskHref = course ? getLearnTaskHref(orgSlug, course.slug, task) : null;
    }
  } catch {
    loadFailed = true;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter
        academyId={academy.id}
        task={task}
        taskHref={taskHref}
        loadFailed={loadFailed}
        emptyStateHref={getLearnAcademyHref(orgSlug, academySlug)}
        emptyStateLabel="Back to Academy"
      />
    </div>
  );
}
