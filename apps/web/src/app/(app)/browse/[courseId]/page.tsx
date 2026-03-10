import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolveBrand } from "@/lib/brand/resolve";
import { ConceptList } from "@/components/app/concept-list";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

interface Concept {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  sortOrder: number;
  slug: string;
}

interface ConceptState {
  conceptId: string;
  masteryState: MasteryState;
}

interface CourseGraph {
  course: {
    id: string;
    name: string;
    description: string | null;
  };
  concepts: Concept[];
}

interface CourseProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);
  const orgId = brand.orgId;

  let graph: CourseGraph | null = null;
  let profile: CourseProfile | null = null;
  const masteryMap = new Map<string, MasteryState>();

  try {
    [graph, profile] = await Promise.all([
      apiFetch<CourseGraph>(`/orgs/${orgId}/courses/${courseId}/graph`),
      apiFetch<CourseProfile>(`/orgs/${orgId}/courses/${courseId}/profile`),
    ]);

    // Fetch per-concept mastery
    const states = await apiFetch<ConceptState[]>(
      `/orgs/${orgId}/courses/${courseId}/mastery`
    );
    for (const state of states) {
      masteryMap.set(state.conceptId, state.masteryState);
    }
  } catch {
    // API may not be running
  }

  if (!graph) {
    notFound();
  }

  const conceptsWithMastery = graph.concepts
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((concept) => ({
      ...concept,
      masteryState: masteryMap.get(concept.id) ?? ("unstarted" as MasteryState),
    }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Back nav */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      {/* Course header */}
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {graph.course.name}
      </h1>
      {graph.course.description && (
        <p className="text-muted-foreground mb-6">{graph.course.description}</p>
      )}

      {/* Progress summary */}
      {profile && (
        <div className="rounded-lg border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Course Progress</span>
            <Badge variant="secondary">
              {Math.round(profile.completionPercent)}%
            </Badge>
          </div>
          <Progress value={profile.completionPercent} className="h-2 mb-4" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
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
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {profile.needsReview}
              </p>
              <p className="text-xs text-muted-foreground">Needs Review</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {profile.unstarted}
              </p>
              <p className="text-xs text-muted-foreground">Not Started</p>
            </div>
          </div>
        </div>
      )}

      {/* Concept list */}
      <h2 className="text-xl font-semibold text-foreground mb-4">Concepts</h2>
      <ConceptList concepts={conceptsWithMastery} courseId={courseId} />
    </div>
  );
}
