import { requireLearnAccess, resolveCourseBySlug } from "@/lib/learn-server";
import { getLearnCourseHref, getLearnCourseStudyHref } from "@/lib/learn-routes";
import { QuizFlow, type QuizData } from "@/components/app/quiz-flow";
import { StudyRouter } from "@/components/app/study-router";

export default async function LearnQuizPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string }>;
}) {
  const { orgSlug, courseSlug } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);

  let quizData: QuizData;
  try {
    quizData = await serverApiFetch<QuizData>(`/orgs/${orgSlug}/courses/${course.id}/quizzes/generate`, {
      method: "POST",
    });
  } catch {
    return <StudyRouter courseId={course.id} task={null} loadFailed emptyStateHref={getLearnCourseHref(orgSlug, courseSlug)} emptyStateLabel="Back to Course" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Quiz</h1>
      <QuizFlow
        orgSlug={orgSlug}
        courseId={course.id}
        token={token}
        quizData={quizData}
        continueHref={getLearnCourseStudyHref(orgSlug, courseSlug)}
      />
    </div>
  );
}
