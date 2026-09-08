import { requireLearnAccess, resolveCourseBySlug } from "@/lib/learn-server";
import { getLearnCourseHref, getLearnCourseStudyHref } from "@/lib/learn-routes";
import { ReviewFlow, type ReviewData } from "@/components/app/review-flow";
import { StudyRouter } from "@/components/app/study-router";

export default async function LearnReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string; conceptId: string }>;
}) {
  const { orgSlug, courseSlug, conceptId } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);

  let reviewData: ReviewData;
  try {
    reviewData = await serverApiFetch<ReviewData>(
      `/orgs/${orgSlug}/courses/${course.id}/reviews/${conceptId}/start`,
      { method: "POST" },
    );
  } catch {
    return <StudyRouter courseId={course.id} task={null} loadFailed emptyStateHref={getLearnCourseHref(orgSlug, courseSlug)} emptyStateLabel="Back to Course" />;
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
