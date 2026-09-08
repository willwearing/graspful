import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { ReviewFlow, type ReviewData } from "@/components/app/review-flow";
import { StudyRouter } from "@/components/app/study-router";

export default async function ReviewPage({
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

  const brand = await resolvePageBrand();
  const orgSlug = brand.orgSlug;

  let reviewData: ReviewData;
  try {
    reviewData = await apiFetch<ReviewData>(
      `/orgs/${orgSlug}/courses/${courseId}/reviews/${conceptId}/start`,
      { method: "POST" }
    );
  } catch {
    return <StudyRouter courseId={courseId} task={null} loadFailed emptyStateHref={`/browse/${courseId}`} emptyStateLabel="Back to Course" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Concept Review</h1>
      <ReviewFlow
        orgSlug={orgSlug}
        courseId={courseId}
        conceptId={conceptId}
        token={token}
        initialData={reviewData}
      />
    </div>
  );
}
