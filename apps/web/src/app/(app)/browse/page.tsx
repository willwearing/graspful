import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAcademyHref } from "@/lib/academy-routes";

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  courses: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    sortOrder: number;
    partId: string | null;
  }>;
}

export default async function BrowsePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const serverApiFetch = createApiFetcher(session?.access_token);

  const brand = await resolvePageBrand();

  let academies: Academy[] = [];
  try {
    academies = await serverApiFetch<Academy[]>(`/orgs/${brand.orgSlug}/academies`);
  } catch {
    // Backend may not be running
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Browse Academies</h1>
      <p className="text-muted-foreground mb-8">
        Explore academy tracks and enter the shared learning graph from the right boundary.
      </p>

      {academies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No academies available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {academies.map((academy) => {
            return (
              <div
                key={academy.id}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-foreground">
                        {academy.name}
                      </h2>
                      <Badge variant="outline">
                        {academy.courses.length} courses
                      </Badge>
                    </div>
                    {academy.description ? (
                      <p className="text-sm text-muted-foreground">
                        {academy.description}
                      </p>
                    ) : null}
                    {academy.courses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {academy.courses.map((course) => (
                          <Badge key={course.id} variant="secondary">
                            {course.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button render={<Link href={getAcademyHref(academy.id)} />} className="gap-2">
                    Open Academy
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
