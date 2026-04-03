import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchCourseProfiles } from "@/lib/course-profiles";
import { createApiFetcher } from "@/lib/api";
import { requireLearnAccess, resolveAcademyBySlug } from "@/lib/learn-server";
import {
  getLearnAcademyDiagnosticHref,
  getLearnAcademyStudyHref,
  getLearnCourseHref,
  getLearnOrgHref,
} from "@/lib/learn-routes";
import { CourseCard } from "@/components/app/course-card";
import { KnowledgeGraphSection } from "@/components/app/knowledge-graph-section";
import { AcademyViewTracker } from "@/components/app/page-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AcademyCourse, AcademyDetail, AcademyProfile } from "@graspful/shared";

export default async function LearnAcademyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; academySlug: string }>;
}) {
  const { orgSlug, academySlug } = await params;
  const { serverApiFetch } = await requireLearnAccess(orgSlug);

  const academyRecord = await resolveAcademyBySlug(orgSlug, academySlug, serverApiFetch).catch(
    () => null,
  );
  if (!academyRecord) notFound();

  const academyId = academyRecord.id;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const profileFetch = createApiFetcher(session?.access_token);

  let academy: AcademyDetail | null = null;
  let courses: AcademyCourse[] = [];
  let profile: AcademyProfile | null = null;

  try {
    academy = await serverApiFetch<AcademyDetail>(`/orgs/${orgSlug}/academies/${academyId}`);
  } catch {
    // Not found handled below.
  }

  if (academy) {
    const [coursesRes, profileRes] = await Promise.allSettled([
      serverApiFetch<AcademyCourse[]>(`/orgs/${orgSlug}/academies/${academyId}/courses`),
      serverApiFetch<AcademyProfile>(`/orgs/${orgSlug}/academies/${academyId}/profile`),
    ]);

    courses = coursesRes.status === "fulfilled" ? coursesRes.value : [];
    profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  }

  if (!academy) notFound();

  const profiles = await fetchCourseProfiles(orgSlug, courses, profileFetch);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <AcademyViewTracker academyId={academyId} academyName={academy.name} />
      <Link
        href={getLearnOrgHref(orgSlug)}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learning Hub
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
              <p className="text-2xl font-bold text-muted-foreground">{profile.activeCourses}</p>
              <p className="text-xs text-muted-foreground">Active Courses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{profile.completedCourses}</p>
              <p className="text-xs text-muted-foreground">Completed Courses</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button render={<Link href={getLearnAcademyStudyHref(orgSlug, academySlug)} />}>
              Continue Academy
            </Button>
            <Button
              variant="outline"
              render={<Link href={getLearnAcademyDiagnosticHref(orgSlug, academySlug)} />}
            >
              Take Diagnostic
            </Button>
          </div>
        </div>
      ) : null}

      {courses[0]?.id ? (
        <div className="mb-8">
          <KnowledgeGraphSection orgSlug={orgSlug} courseId={courses[0].id} academyId={academyId} />
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
                href={getLearnCourseHref(orgSlug, course.slug)}
                name={course.name}
                description={course.description}
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
