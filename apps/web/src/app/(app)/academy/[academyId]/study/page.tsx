import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { StudyRouter } from "@/components/app/study-router";
import type { NextTask } from "@/lib/types";

export default async function AcademyStudyPage({
  params,
}: {
  params: Promise<{ academyId: string }>;
}) {
  const { academyId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const serverApiFetch = createApiFetcher(session?.access_token);
  const brand = await resolvePageBrand();

  let task: NextTask | null = null;
  try {
    task = await serverApiFetch<NextTask>(
      `/orgs/${brand.orgSlug}/academies/${academyId}/next-task`,
    );
  } catch {
    // No task available
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter academyId={academyId} task={task} />
    </div>
  );
}
