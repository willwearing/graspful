import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { StatCard } from "@/components/creator/stat-card";
import { CourseList } from "@/components/creator/course-list";
import { Button } from "@/components/ui/button";

interface OrgMembership {
  orgId: string;
  slug: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface CreatorStats {
  students: number;
  avgCompletion: number;
  totalRevenue: number;
}

interface CreatorCourse {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  description?: string | null;
  version: string;
  estimatedHours?: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function CreatorDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const serverApiFetch = createApiFetcher(session?.access_token);

  // Resolve the user's own org (owner/admin), falling back to "graspful".
  let orgSlug = "graspful";
  try {
    const orgs = await serverApiFetch<OrgMembership[]>("/users/me/orgs");
    const ownedOrgs = orgs.filter((o) => o.role === "owner" || o.role === "admin");
    const ownOrg = ownedOrgs.find((o) => o.slug !== "graspful");
    if (ownOrg) {
      orgSlug = ownOrg.slug;
    } else if (ownedOrgs.length > 0) {
      orgSlug = ownedOrgs[0].slug;
    }
  } catch {
    // Fall back to default org
  }

  // Fetch creator stats and courses in parallel
  let stats: CreatorStats = { students: 0, avgCompletion: 0, totalRevenue: 0 };
  let courses: CreatorCourse[] = [];

  const [statsRes, coursesRes] = await Promise.allSettled([
    serverApiFetch<CreatorStats>(`/orgs/${orgSlug}/creator/stats`),
    serverApiFetch<CreatorCourse[]>(`/orgs/${orgSlug}/courses`),
  ]);

  if (statsRes.status === "fulfilled") stats = statsRes.value;
  if (coursesRes.status === "fulfilled") courses = coursesRes.value;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Creator Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your courses and track performance.
          </p>
        </div>
        <Button render={<Link href="/creator/manage" />}>
          <Plus className="h-4 w-4" />
          New Course
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard
          title="Students"
          value={stats.students.toLocaleString()}
          icon="Users"
        />
        <StatCard
          title="Avg Completion"
          value={`${Math.round(stats.avgCompletion)}%`}
          icon="TrendingUp"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon="DollarSign"
        />
      </div>

      {/* Course list */}
      <h2 className="text-xl font-semibold text-foreground mb-4">Your Courses</h2>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No courses yet. Create your first course to get started.
          </p>
          <Button render={<Link href="/creator/manage" />}>
            Create Course
          </Button>
        </div>
      ) : (
        <CourseList
          courses={courses}
          orgSlug={orgSlug}
          token={session?.access_token ?? ""}
        />
      )}
    </div>
  );
}
