import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolveBrand } from "@/lib/brand/resolve";
import { DiagnosticFlow } from "@/components/app/diagnostic-flow";

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
    await apiFetch(`${basePath}/enroll`);
  } catch {
    // May already be enrolled — continue
  }

  // Start diagnostic
  const startData = await apiFetch<any>(`${basePath}/diagnostic/start`);

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
