import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { SectionExamFlow, type SectionExamData } from "@/components/app/section-exam-flow";
import { StudyRouter } from "@/components/app/study-router";

export default async function SectionExamPage({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>;
}) {
  const { courseId, sectionId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/sign-in");

  const brand = await resolvePageBrand();
  const orgSlug = brand.orgSlug;

  let examData: SectionExamData;
  try {
    examData = await apiFetch<SectionExamData>(
      `/orgs/${orgSlug}/courses/${courseId}/sections/${sectionId}/exam/start`,
      { method: "POST" }
    );
  } catch {
    return <StudyRouter courseId={courseId} task={null} loadFailed emptyStateHref={`/browse/${courseId}`} emptyStateLabel="Back to Course" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <SectionExamFlow
        orgSlug={orgSlug}
        courseId={courseId}
        sectionId={sectionId}
        token={token}
        examData={examData}
      />
    </div>
  );
}
