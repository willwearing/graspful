import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { ConceptList } from "@/components/app/concept-list";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { MasteryState, NextTask, SectionProgress, SectionMasteryState } from "@/lib/types";
import { getSectionHref } from "@/lib/course-section-entry";
import { getAcademyHref, getAcademyStudyHref, getAcademyDiagnosticHref } from "@/lib/academy-routes";
import { CourseBrowseTracker } from "@/components/app/page-view-tracker";

interface CourseSection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

interface Concept {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  sortOrder: number;
  slug: string;
  sectionId: string | null;
}

interface ConceptState {
  conceptId: string;
  masteryState: MasteryState;
}

interface CourseGraph {
  course: {
    academyId?: string | null;
    id: string;
    name: string;
    description: string | null;
  };
  sections: CourseSection[];
  concepts: Concept[];
}

interface CourseProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
  diagnosticCompleted: boolean;
  certifiedSections?: number;
  examReadySections?: number;
}

const sectionStatusLabel: Record<SectionMasteryState, string> = {
  locked: "Locked",
  lesson_in_progress: "Learning",
  exam_ready: "Exam Ready",
  certified: "Certified",
  needs_review: "Needs Review",
};

const sectionStatusVariant: Record<SectionMasteryState, "secondary" | "default" | "destructive" | "outline"> = {
  locked: "outline",
  lesson_in_progress: "secondary",
  exam_ready: "default",
  certified: "secondary",
  needs_review: "destructive",
};

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

  const brand = await resolvePageBrand();
  const orgSlug = brand.orgSlug;

  let graph: CourseGraph | null = null;
  let profile: CourseProfile | null = null;
  let nextTask: NextTask | null = null;
  let sectionProgress: SectionProgress[] = [];
  const masteryMap = new Map<string, MasteryState>();

  try {
    // Fetch graph first — if this fails, the course doesn't exist
    graph = await apiFetch<CourseGraph>(`/orgs/${orgSlug}/courses/${courseId}/graph`);
  } catch {
    // API may not be running or course not found
  }

  if (graph) {
    // Fetch learner-specific data — failures here shouldn't 404 the page
    const [profileRes, nextTaskRes, sectionsRes, masteryRes] =
      await Promise.allSettled([
        apiFetch<CourseProfile>(`/orgs/${orgSlug}/courses/${courseId}/profile`),
        apiFetch<NextTask>(`/orgs/${orgSlug}/courses/${courseId}/next-task`),
        apiFetch<SectionProgress[]>(`/orgs/${orgSlug}/courses/${courseId}/sections`),
        apiFetch<ConceptState[]>(`/orgs/${orgSlug}/courses/${courseId}/mastery`),
      ]);

    profile = profileRes.status === "fulfilled" ? profileRes.value : null;
    nextTask = nextTaskRes.status === "fulfilled" ? nextTaskRes.value : null;
    sectionProgress = sectionsRes.status === "fulfilled" ? sectionsRes.value : [];

    if (masteryRes.status === "fulfilled") {
      for (const state of masteryRes.value) {
        masteryMap.set(state.conceptId, state.masteryState);
      }
    }
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
  const courseUnlocked = !!profile && (
    profile.diagnosticCompleted || profile.completionPercent > 0
  );
  const academyHref = graph.course.academyId
    ? getAcademyHref(graph.course.academyId)
    : "/browse";
  const studyEntryHref = graph.course.academyId
    ? getAcademyStudyHref(graph.course.academyId)
    : `/study/${courseId}`;

  const primaryCTA = (() => {
    if (!nextTask) {
      return {
        href: studyEntryHref,
        label: "Continue Studying",
        description: "Pick up where you left off.",
      };
    }

    if (nextTask.taskType === "section_exam" && nextTask.sectionId) {
      const section = sectionProgress.find((item) => item.sectionId === nextTask.sectionId);
      return {
        href: studyEntryHref,
        label: "Take Section Exam",
        description: section
          ? `Certify ${section.section.name} before moving deeper into the course.`
          : "A section exam is ready.",
      };
    }

    if (nextTask.taskType === "quiz") {
      return {
        href: studyEntryHref,
        label: "Take Quiz",
        description: "You are due for a broader checkpoint quiz.",
      };
    }

    return {
      href: studyEntryHref,
      label: "Continue Studying",
      description: "Pick up where you left off.",
    };
  })();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <CourseBrowseTracker courseId={courseId} courseName={graph.course.name} />
      {/* Back nav */}
      <Link
        href={academyHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {graph.course.academyId ? "Back to Academy" : "Back to Courses"}
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
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">
              {profile.certifiedSections ?? 0} certified sections
            </Badge>
            <Badge variant="outline">
              {profile.examReadySections ?? 0} exam-ready sections
            </Badge>
          </div>
        </div>
      )}

      {/* Diagnostic CTA or Continue Studying */}
      {courseUnlocked ? (
        <div className="rounded-lg border border-border p-6 mb-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Keep going
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {primaryCTA.description}
          </p>
          <Button render={<Link href={primaryCTA.href} />}>
            {primaryCTA.label}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border p-6 mb-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Know some of this already?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Take a diagnostic assessment to skip what you already know.
          </p>
          <Button render={<Link href={graph.course.academyId ? getAcademyDiagnosticHref(graph.course.academyId) : `/diagnostic/${courseId}`} />}>
            Take Diagnostic
          </Button>
        </div>
      )}

      {sectionProgress.length > 0 ? (
        <>
          <h2 className="text-xl font-semibold text-foreground mb-4">Sections</h2>
          <div className="grid gap-4 mb-8">
            {sectionProgress
              .sort((a, b) => a.section.sortOrder - b.section.sortOrder)
              .map((item) => {
                const masteredCount = item.conceptStates.filter(
                  (state) => state.masteryState === "mastered"
                ).length;
                const href = getSectionHref({
                  courseId,
                  courseUnlocked,
                  concepts: graph.concepts,
                  nextTask,
                  sectionProgress: item,
                });
                const actionLabel = item.status === "exam_ready"
                  ? "Take Section Exam"
                  : item.status === "needs_review"
                    ? "Resume Review"
                    : href
                      ? "Start Studying"
                      : null;
                const cardContent = (
                  <div
                    className={`rounded-xl border border-border bg-card p-5 transition-colors ${
                      href ? "hover:border-primary/30" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {item.section.name}
                          </h3>
                          <Badge variant={sectionStatusVariant[item.status]}>
                            {sectionStatusLabel[item.status]}
                          </Badge>
                        </div>
                        {item.section.description ? (
                          <p className="text-sm text-muted-foreground">
                            {item.section.description}
                          </p>
                        ) : null}
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {masteredCount}/{item.section.concepts.length} concepts mastered
                        </p>
                      </div>
                      {actionLabel ? (
                        <div className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary">
                          <span>{actionLabel}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );

                return (
                  <div key={item.sectionId}>
                    {href ? (
                      <Link href={href} className="block">
                        {cardContent}
                      </Link>
                    ) : (
                      cardContent
                    )}
                  </div>
                );
              })}
          </div>
        </>
      ) : null}

      {/* Concept list */}
      <h2 className="text-xl font-semibold text-foreground mb-4">Concepts</h2>
      <ConceptList
        concepts={conceptsWithMastery}
        sections={graph.sections ?? []}
        courseId={courseId}
        locked={!courseUnlocked}
      />
    </div>
  );
}
