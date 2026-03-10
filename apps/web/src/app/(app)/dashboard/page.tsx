import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolveBrand } from "@/lib/brand/resolve";
import { headers } from "next/headers";
import { CourseCard } from "@/components/app/course-card";
import { StreakCounter } from "@/components/app/streak-counter";
import { XPProgress } from "@/components/app/xp-progress";
import { MasteryChart } from "@/components/app/mastery-chart";
import { ContinueStudying } from "@/components/app/continue-studying";
import { WeeklyXPChart } from "@/components/app/weekly-xp-chart";
import { CompletionEstimate } from "@/components/app/completion-estimate";
import { Leaderboard } from "@/components/app/leaderboard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CourseProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
}

interface Course {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
}

interface XPSummary {
  today: number;
  thisWeek: number;
  total: number;
  dailyTarget: number;
  dailyCap: number;
}

interface StreakStatusResponse {
  currentStreak: number;
  longestStreak: number;
  todayComplete: boolean;
  todayXP: number;
  dailyTarget: number;
  freezeTokensRemaining: number;
}

interface DailyXP {
  date: string;
  xp: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyXP: number;
}

interface StatsResponse {
  completionPercent: number;
  totalConcepts: number;
  masteredConcepts: number;
  remainingConcepts: number;
  averageDailyXP: number;
  estimatedWeeksRemaining: number | null;
  dailyXPTarget: number;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  // Fetch enrolled courses
  let courses: Course[] = [];
  const profiles: Map<string, CourseProfile> = new Map();

  try {
    courses = await apiFetch<Course[]>(`/orgs/${brand.orgId}/courses`);

    // Fetch profile for each course
    const profileResults = await Promise.allSettled(
      courses.map(async (course) => {
        const profile = await apiFetch<CourseProfile>(
          `/orgs/${brand.orgId}/courses/${course.id}/profile`
        );
        return { courseId: course.id, profile };
      })
    );

    for (const result of profileResults) {
      if (result.status === "fulfilled") {
        profiles.set(result.value.courseId, result.value.profile);
      }
    }
  } catch {
    // API may not be running -- show empty state
  }

  // Fetch gamification data for first course
  let xpSummary: XPSummary | null = null;
  let streakStatus: StreakStatusResponse | null = null;
  let weeklyXP: DailyXP[] = [];
  let leaderboard: LeaderboardEntry[] = [];
  let stats: StatsResponse | null = null;

  if (courses.length > 0) {
    const courseId = courses[0].id;
    const basePath = `/orgs/${brand.orgId}/courses/${courseId}`;

    const [xpRes, streakRes, weeklyRes, boardRes, statsRes] =
      await Promise.allSettled([
        apiFetch<XPSummary>(`${basePath}/xp`),
        apiFetch<StreakStatusResponse>(`${basePath}/streak`),
        apiFetch<DailyXP[]>(`${basePath}/xp/weekly`),
        apiFetch<LeaderboardEntry[]>(`${basePath}/leaderboard`),
        apiFetch<StatsResponse>(`${basePath}/stats`),
      ]);

    xpSummary = xpRes.status === "fulfilled" ? xpRes.value : null;
    streakStatus = streakRes.status === "fulfilled" ? streakRes.value : null;
    weeklyXP = weeklyRes.status === "fulfilled" ? weeklyRes.value : [];
    leaderboard = boardRes.status === "fulfilled" ? boardRes.value : [];
    stats = statsRes.status === "fulfilled" ? statsRes.value : null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
      <p className="text-muted-foreground mb-8">
        Pick up where you left off.
      </p>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <StreakCounter streakDays={streakStatus?.currentStreak ?? 0} />
        <XPProgress
          earnedToday={xpSummary?.today ?? 0}
          dailyTarget={xpSummary?.dailyTarget ?? 40}
        />
      </div>

      {/* Completion estimate */}
      {stats && (
        <div className="mb-8">
          <CompletionEstimate
            completionPercent={stats.completionPercent}
            estimatedWeeksRemaining={stats.estimatedWeeksRemaining}
            averageDailyXP={stats.averageDailyXP}
            masteredConcepts={stats.masteredConcepts}
            totalConcepts={stats.totalConcepts}
          />
        </div>
      )}

      {/* Continue studying — show for first course with progress */}
      {courses.length > 0 && (() => {
        const firstCourse = courses[0];
        const profile = profiles.get(firstCourse.id);
        if (profile && profile.completionPercent > 0) {
          return (
            <div className="mb-8">
              <ContinueStudying courseId={firstCourse.id} courseName={firstCourse.name} />
            </div>
          );
        }
        return null;
      })()}

      {/* Weekly XP chart */}
      {weeklyXP.length > 0 && (
        <div className="mb-8">
          <WeeklyXPChart data={weeklyXP} />
        </div>
      )}

      {/* Mastery chart — show for first course with data */}
      {courses.length > 0 && (() => {
        const firstCourse = courses[0];
        const profile = profiles.get(firstCourse.id);
        if (profile && profile.totalConcepts > 0) {
          return (
            <div className="mb-8">
              <MasteryChart
                mastered={profile.mastered}
                inProgress={profile.inProgress}
                needsReview={profile.needsReview}
                unstarted={profile.unstarted}
                totalConcepts={profile.totalConcepts}
              />
            </div>
          );
        }
        return null;
      })()}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mb-8">
          <Leaderboard entries={leaderboard} currentUserId={user.id} />
        </div>
      )}

      {/* Courses */}
      <h2 className="text-xl font-semibold text-foreground mb-4">Your Courses</h2>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No courses yet. Browse available courses to get started.
          </p>
          <Button render={<Link href="/browse" />}>
            Browse Courses
          </Button>
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
