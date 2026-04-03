import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { requireLearnSession, resolveCourseBySlug } from "@/lib/learn-server";
import { getLearnCourseHref } from "@/lib/learn-routes";
import { DiagnosticFlow } from "@/components/app/diagnostic-flow";

export default async function LearnCourseDiagnosticPage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string }>;
}) {
  const { orgSlug, courseSlug } = await params;
  const { token } = await requireLearnSession();
  const course = await resolveCourseBySlug(orgSlug, courseSlug);
  const courseHref = getLearnCourseHref(orgSlug, courseSlug);

  let startData: any = null;
  let errorMessage: string | null = null;

  try {
    startData = await apiFetch<any>(`/orgs/${orgSlug}/courses/${course.id}/diagnostic/start`, {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 400) {
      errorMessage = "This course doesn't have diagnostic content yet. Check back soon.";
    } else if (err instanceof ApiError && err.statusCode === 404) {
      errorMessage = "Could not start diagnostic for this course.";
    } else {
      errorMessage = "Something went wrong starting the diagnostic. Please try again.";
    }
  }

  if (errorMessage || !startData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Link
          href={courseHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Diagnostic Unavailable</h2>
          <p className="text-muted-foreground">{errorMessage ?? "Could not load the diagnostic."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Diagnostic Assessment</h1>
      <DiagnosticFlow
        orgSlug={orgSlug}
        courseId={course.id}
        token={token}
        initialData={startData}
        completionHref={courseHref}
        completionLabel="Go to Course"
      />
    </div>
  );
}
