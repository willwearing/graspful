import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { QuizFlow, type QuizData } from "@/components/app/quiz-flow";
import { StudyRouter } from "@/components/app/study-router";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/sign-in");

  const brand = await resolvePageBrand();
  const orgSlug = brand.orgSlug;

  let quizData: QuizData;
  try {
    quizData = await apiFetch<QuizData>(
      `/orgs/${orgSlug}/courses/${courseId}/quizzes/generate`,
      { method: "POST" }
    );
  } catch {
    return <StudyRouter courseId={courseId} task={null} loadFailed emptyStateHref={`/browse/${courseId}`} emptyStateLabel="Back to Course" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Quiz</h1>
      <QuizFlow orgSlug={orgSlug} courseId={courseId} token={token} quizData={quizData} />
    </div>
  );
}
