import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { SectionExamFlow } from "@/components/app/section-exam-flow";

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
  const orgId = brand.orgId;

  const examData = await apiFetch<any>(
    `/orgs/${orgId}/courses/${courseId}/sections/${sectionId}/exam/start`,
    { method: "POST" }
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <SectionExamFlow
        orgId={orgId}
        courseId={courseId}
        sectionId={sectionId}
        token={token}
        examData={examData}
      />
    </div>
  );
}
