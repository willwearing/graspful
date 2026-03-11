import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveBrand } from "@/lib/brand/resolve";
import { DiagnosticFlow } from "@/components/app/diagnostic-flow";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function DiagnosticPage({
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

  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);
  const orgId = brand.orgId;

  const basePath = `/orgs/${orgId}/courses/${courseId}`;

  // Enroll if not already (idempotent on backend)
  try {
    await apiFetch(`${basePath}/enroll`, { method: "POST" });
  } catch {
    // May already be enrolled — continue
  }

  // Start diagnostic
  let startData: any = null;
  let errorMessage: string | null = null;
  try {
    startData = await apiFetch<any>(`${basePath}/diagnostic/start`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 400) {
      errorMessage = "This course doesn't have diagnostic content yet. Check back soon.";
    } else if (err instanceof ApiError && err.statusCode === 404) {
      errorMessage = "Could not start diagnostic. Please try enrolling in the course first.";
    } else {
      errorMessage = "Something went wrong starting the diagnostic. Please try again.";
    }
  }

  if (errorMessage || !startData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Link
          href={`/browse/${courseId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Diagnostic Unavailable</h2>
          <p className="text-muted-foreground">
            {errorMessage ?? "Could not load the diagnostic."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Diagnostic Assessment</h1>
      <DiagnosticFlow
        orgId={orgId}
        courseId={courseId}
        token={token}
        initialData={startData}
      />
    </div>
  );
}
