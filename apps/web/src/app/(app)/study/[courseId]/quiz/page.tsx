import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { QuizFlow } from "@/components/app/quiz-flow";

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
  const orgId = brand.orgId;

  const quizData = await apiFetch<any>(
    `/orgs/${orgId}/courses/${courseId}/quizzes/generate`,
    { method: "POST" }
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Quiz</h1>
      <QuizFlow orgId={orgId} courseId={courseId} token={token} quizData={quizData} />
    </div>
  );
}
