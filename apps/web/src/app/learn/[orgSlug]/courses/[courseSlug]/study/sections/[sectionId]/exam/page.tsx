import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { requireLearnAccess, resolveCourseBySlug } from "@/lib/learn-server";
import {
  getLearnCourseHref,
  getLearnCourseStudyHref,
} from "@/lib/learn-routes";
import { SectionExamFlow } from "@/components/app/section-exam-flow";

export default async function LearnSectionExamPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string; sectionId: string }>;
}) {
  const { orgSlug, courseSlug, sectionId } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);

  let examData: any;
  try {
    examData = await apiFetch<any>(
      `/orgs/${orgSlug}/courses/${course.id}/sections/${sectionId}/exam/start`,
      { method: "POST" },
    );
  } catch {
    redirect(getLearnCourseStudyHref(orgSlug, courseSlug));
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
