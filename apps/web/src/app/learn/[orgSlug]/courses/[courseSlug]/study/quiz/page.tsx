import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { requireLearnSession, resolveCourseBySlug } from "@/lib/learn-server";
import { getLearnCourseStudyHref } from "@/lib/learn-routes";
import { QuizFlow } from "@/components/app/quiz-flow";

export default async function LearnQuizPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string }>;
}) {
  const { orgSlug, courseSlug } = await params;
  const { token } = await requireLearnSession();
  const course = await resolveCourseBySlug(orgSlug, courseSlug);

  let quizData: any;
  try {
    quizData = await apiFetch<any>(`/orgs/${orgSlug}/courses/${course.id}/quizzes/generate`, {
      method: "POST",
    });
  } catch {
    redirect(getLearnCourseStudyHref(orgSlug, courseSlug));
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
