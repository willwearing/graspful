import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { StudyRouter } from "@/components/app/study-router";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const brand = await resolvePageBrand();

  let task = null;
  try {
    task = await apiFetch<any>(`/orgs/${brand.orgId}/courses/${courseId}/next-task`);
  } catch {
    // No task available
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter courseId={courseId} task={task} />
    </div>
  );
}
