import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { requireLearnSession, resolveCourseBySlug } from "@/lib/learn-server";
import { getLearnCourseStudyHref } from "@/lib/learn-routes";
import { ReviewFlow } from "@/components/app/review-flow";

export default async function LearnReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string; conceptId: string }>;
}) {
  const { orgSlug, courseSlug, conceptId } = await params;
  const { token } = await requireLearnSession();
  const course = await resolveCourseBySlug(orgSlug, courseSlug);

  let reviewData: any;
  try {
    reviewData = await apiFetch<any>(
      `/orgs/${orgSlug}/courses/${course.id}/reviews/${conceptId}/start`,
      { method: "POST" },
    );
  } catch {
    redirect(getLearnCourseStudyHref(orgSlug, courseSlug));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Concept Review</h1>
      <ReviewFlow
        orgSlug={orgSlug}
        courseId={course.id}
        conceptId={conceptId}
        token={token}
        initialData={reviewData}
        continueHref={getLearnCourseStudyHref(orgSlug, courseSlug)}
      />
    </div>
  );
}
