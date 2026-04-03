import { requireLearnSession, resolveAcademyBySlug } from "@/lib/learn-server";
import { getLearnAcademyHref, getLearnTaskHref } from "@/lib/learn-routes";
import { StudyRouter } from "@/components/app/study-router";
import type { NextTask } from "@/lib/types";

export default async function LearnAcademyStudyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; academySlug: string }>;
}) {
  const { orgSlug, academySlug } = await params;
  const { serverApiFetch } = await requireLearnSession();

  const academy = await resolveAcademyBySlug(orgSlug, academySlug, serverApiFetch);
  const courses = await serverApiFetch<Array<{ id: string; slug: string }>>(
    `/orgs/${orgSlug}/academies/${academy.id}/courses`,
  ).catch(() => []);
  const courseSlugById = new Map(courses.map((course) => [course.id, course.slug]));

  let task: NextTask | null = null;
  try {
    task = await serverApiFetch<NextTask>(`/orgs/${orgSlug}/academies/${academy.id}/next-task`);
  } catch {
    // No task available.
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter
        academyId={academy.id}
        task={task}
        resolveTaskHref={(courseId, nextTask) => {
          const courseSlug = courseSlugById.get(courseId);
          if (!courseSlug) return null;
          return getLearnTaskHref(orgSlug, courseSlug, nextTask);
        }}
        emptyStateHref={getLearnAcademyHref(orgSlug, academySlug)}
        emptyStateLabel="Back to Academy"
      />
    </div>
  );
}
