import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { CourseCard } from "@/components/app/course-card";
import { fetchCourseProfiles, type CourseProfile } from "@/lib/course-profiles";

interface Course {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
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

  let courses: Course[] = [];
  let profiles: Map<string, CourseProfile> = new Map();
  try {
    courses = await serverApiFetch<Course[]>(`/orgs/${brand.orgSlug}/courses`);
    profiles = await fetchCourseProfiles(brand.orgSlug, courses, serverApiFetch);
  } catch {
    // Backend may not be running
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Browse Courses</h1>
      <p className="text-muted-foreground mb-8">
        Explore available courses and start learning.
      </p>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No courses available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const profile = profiles.get(course.id);
            return (
              <CourseCard
                key={course.id}
                courseId={course.id}
                name={course.name}
                description={course.description}
                orgId={course.orgId}
                completionPercent={profile?.completionPercent ?? 0}
                totalConcepts={profile?.totalConcepts ?? 0}
                mastered={profile?.mastered ?? 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
