import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/app/course-card";
import { getLearnAcademyHref, getLearnCourseHref } from "@/lib/learn-routes";
import { requireLearnSession } from "@/lib/learn-server";

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
  }>;
}

interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  academyId?: string | null;
}

export default async function LearnOrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { serverApiFetch } = await requireLearnSession();

  const [academies, courses] = await Promise.all([
    serverApiFetch<Academy[]>(`/orgs/${orgSlug}/academies`).catch(() => []),
    serverApiFetch<Course[]>(`/orgs/${orgSlug}/courses`).catch(() => []),
  ]);

  const standaloneCourses = courses.filter((course) => !course.academyId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Learning Hub</h1>
        <p className="text-muted-foreground">
          Explore academies and courses published under <span className="font-medium text-foreground">{orgSlug}</span>.
        </p>
      </div>

      {academies.length > 0 ? (
        <section className="mb-10 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Academies</h2>
            <Badge variant="outline">{academies.length}</Badge>
          </div>
          <div className="space-y-4">
            {academies.map((academy) => (
              <div key={academy.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-foreground">{academy.name}</h3>
                      <Badge variant="outline">{academy.courses.length} courses</Badge>
                    </div>
                    {academy.description ? (
                      <p className="text-sm text-muted-foreground">{academy.description}</p>
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
                  <Button render={<Link href={getLearnAcademyHref(orgSlug, academy.slug)} />} className="gap-2">
                    Open Academy
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {standaloneCourses.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Standalone Courses</h2>
            <Badge variant="outline">{standaloneCourses.length}</Badge>
          </div>
          <div className="space-y-4">
            {standaloneCourses.map((course) => (
              <CourseCard
                key={course.id}
                courseId={course.id}
                href={getLearnCourseHref(orgSlug, course.slug)}
                name={course.name}
                description={course.description}
                completionPercent={0}
                totalConcepts={0}
                mastered={0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {academies.length === 0 && standaloneCourses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No academies or courses are available yet.</p>
        </div>
      ) : null}
    </div>
  );
}
