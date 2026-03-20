import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { CourseCard } from "@/components/app/course-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchCourseProfiles } from "@/lib/course-profiles";
import {
  getAcademyStudyHref,
  getCourseBrowseHref,
} from "@/lib/academy-routes";

interface AcademyCourse {
  id: string;
  academyId: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
}

interface AcademyDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface AcademyProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
  diagnosticCompleted: boolean;
  activeCourses: number;
  completedCourses: number;
}

export default async function AcademyPage({
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

  let academy: AcademyDetail | null = null;
  let courses: AcademyCourse[] = [];
  let profile: AcademyProfile | null = null;

  try {
    // Fetch academy detail first — if this fails, the academy doesn't exist
    academy = await serverApiFetch<AcademyDetail>(`/orgs/${brand.orgSlug}/academies/${academyId}`);
  } catch {
    // Backend may not be running or academy may not exist
  }

  if (academy) {
    // Fetch learner-specific data — failures here shouldn't 404 the page
    const [coursesRes, profileRes] = await Promise.allSettled([
      serverApiFetch<AcademyCourse[]>(`/orgs/${brand.orgSlug}/academies/${academyId}/courses`),
      serverApiFetch<AcademyProfile>(`/orgs/${brand.orgSlug}/academies/${academyId}/profile`),
    ]);

    courses = coursesRes.status === "fulfilled" ? coursesRes.value : [];
    profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  }

  if (!academy) {
    notFound();
  }

  const profiles = await fetchCourseProfiles(brand.orgSlug, courses, serverApiFetch);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Link
        href="/browse"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Academies
      </Link>

      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{academy.name}</h1>
          <Badge variant="outline">{courses.length} courses</Badge>
        </div>
        {academy.description ? (
          <p className="text-muted-foreground">{academy.description}</p>
        ) : null}
      </div>

      {profile ? (
        <div className="mb-8 rounded-lg border border-border p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Academy Progress</span>
            <Badge variant="secondary">{Math.round(profile.completionPercent)}%</Badge>
          </div>
          <Progress value={profile.completionPercent} className="mb-4 h-2" />
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {profile.mastered}
              </p>
              <p className="text-xs text-muted-foreground">Mastered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{profile.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {profile.activeCourses}
              </p>
              <p className="text-xs text-muted-foreground">Active Courses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {profile.completedCourses}
              </p>
              <p className="text-xs text-muted-foreground">Completed Courses</p>
            </div>
          </div>
          <div className="mt-6">
            <Button render={<Link href={getAcademyStudyHref(academyId)} />}>
              Continue Academy
            </Button>
          </div>
        </div>
      ) : null}

      <h2 className="mb-4 text-xl font-semibold text-foreground">Courses</h2>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No courses available in this academy yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const courseProfile = profiles.get(course.id);

            return (
              <CourseCard
                key={course.id}
                courseId={course.id}
                href={getCourseBrowseHref(course.id)}
                name={course.name}
                description={course.description}
                orgId={course.orgId}
                completionPercent={courseProfile?.completionPercent ?? 0}
                totalConcepts={courseProfile?.totalConcepts ?? 0}
                mastered={courseProfile?.mastered ?? 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
