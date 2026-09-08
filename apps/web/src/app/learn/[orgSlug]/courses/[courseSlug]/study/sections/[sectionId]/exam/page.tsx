import { requireLearnAccess, resolveCourseBySlug } from "@/lib/learn-server";
import {
  getLearnCourseHref,
  getLearnCourseStudyHref,
} from "@/lib/learn-routes";
import { SectionExamFlow, type SectionExamData } from "@/components/app/section-exam-flow";
import { StudyRouter } from "@/components/app/study-router";

export default async function LearnSectionExamPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string; sectionId: string }>;
}) {
  const { orgSlug, courseSlug, sectionId } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);

  let examData: SectionExamData;
  try {
    examData = await serverApiFetch<SectionExamData>(
      `/orgs/${orgSlug}/courses/${course.id}/sections/${sectionId}/exam/start`,
      { method: "POST" },
    );
  } catch {
    return <StudyRouter courseId={course.id} task={null} loadFailed emptyStateHref={getLearnCourseHref(orgSlug, courseSlug)} emptyStateLabel="Back to Course" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <SectionExamFlow
        orgSlug={orgSlug}
        courseId={course.id}
        sectionId={sectionId}
        token={token}
        examData={examData}
        backToCourseHref={getLearnCourseHref(orgSlug, courseSlug)}
        continueHref={getLearnCourseStudyHref(orgSlug, courseSlug)}
      />
    </div>
  );
}
