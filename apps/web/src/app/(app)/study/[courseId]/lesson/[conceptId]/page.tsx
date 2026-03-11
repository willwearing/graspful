import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveBrand } from "@/lib/brand/resolve";
import { LessonFlow } from "@/components/app/lesson-flow";
import { ArrowLeft } from "lucide-react";

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

  let lesson: any = null;
  let errorMessage: string | null = null;
  try {
    lesson = await apiFetch<any>(
      `/orgs/${orgId}/courses/${courseId}/lessons/${conceptId}/start`,
      { method: "POST" }
    );
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 400) {
      errorMessage = err.message.includes("blocked")
        ? "This concept is blocked by a prerequisite. Complete the required reviews first."
        : err.message.includes("mastered")
          ? "You've already mastered this concept."
          : "Cannot start this lesson right now.";
    } else if (err instanceof ApiError && err.statusCode === 404) {
      errorMessage = "Lesson not found. You may need to complete the diagnostic first.";
    } else {
      errorMessage = "Something went wrong loading the lesson. Please try again.";
    }
  }

  if (errorMessage || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <Link
          href={`/browse/${courseId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Lesson Unavailable</h2>
          <p className="text-muted-foreground">
            {errorMessage ?? "Could not load the lesson."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <LessonFlow orgId={orgId} courseId={courseId} token={token} lesson={lesson} />
    </div>
  );
}
