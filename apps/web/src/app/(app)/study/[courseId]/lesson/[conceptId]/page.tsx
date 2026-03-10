import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolveBrand } from "@/lib/brand/resolve";
import { LessonFlow } from "@/components/app/lesson-flow";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; conceptId: string }>;
}) {
  const { courseId, conceptId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/sign-in");

  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);
  const orgId = brand.orgId;

  const lesson = await apiFetch<any>(
    `/orgs/${orgId}/courses/${courseId}/lessons/${conceptId}/start`
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <LessonFlow orgId={orgId} courseId={courseId} token={token} lesson={lesson} />
    </div>
  );
}
