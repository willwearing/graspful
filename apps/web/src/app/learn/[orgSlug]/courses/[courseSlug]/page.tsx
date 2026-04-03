import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { requireLearnAccess, resolveCourseBySlug } from "@/lib/learn-server";
import {
  getLearnAcademyDiagnosticHref,
  getLearnAcademyHref,
  getLearnAcademyStudyHref,
  getLearnCourseDiagnosticHref,
  getLearnCourseStudyHref,
  getLearnLessonHref,
  getLearnOrgHref,
} from "@/lib/learn-routes";
import { CourseBrowseTracker } from "@/components/app/page-view-tracker";
import { ConceptList } from "@/components/app/concept-list";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CourseGraph,
  CourseProfile,
  MasteryState,
  NextTask,
  SectionMasteryState,
  SectionProgress,
  AcademyDetail,
} from "@graspful/shared";

const sectionStatusLabel: Record<SectionMasteryState, string> = {
  locked: "Locked",
  lesson_in_progress: "Learning",
  exam_ready: "Exam Ready",
  certified: "Certified",
  needs_review: "Needs Review",
};

const sectionStatusVariant: Record<
  SectionMasteryState,
  "secondary" | "default" | "destructive" | "outline"
> = {
  locked: "outline",
  lesson_in_progress: "secondary",
  exam_ready: "default",
  certified: "secondary",
  needs_review: "destructive",
};

export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ orgSlug: string; courseSlug: string }>;
}) {
  const { orgSlug, courseSlug } = await params;
  const { serverApiFetch } = await requireLearnAccess(orgSlug);

  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch).catch(() => null);
  if (!course) notFound();

  const courseId = course.id;

  let graph: CourseGraph | null = null;
  let profile: CourseProfile | null = null;
  let nextTask: NextTask | null = null;
  let sectionProgress: SectionProgress[] = [];
  const masteryMap = new Map<string, MasteryState>();

  try {
    graph = await apiFetch<CourseGraph>(`/orgs/${orgSlug}/courses/${courseId}/graph`);
  } catch {
    // Not found handled below.
  }

  if (!graph) notFound();

  const [profileRes, nextTaskRes, sectionsRes, masteryRes] = await Promise.allSettled([
    apiFetch<CourseProfile>(`/orgs/${orgSlug}/courses/${courseId}/profile`),
    apiFetch<NextTask>(`/orgs/${orgSlug}/courses/${courseId}/next-task`),
    apiFetch<SectionProgress[]>(`/orgs/${orgSlug}/courses/${courseId}/sections`),
    apiFetch<Array<{ conceptId: string; masteryState: MasteryState }>>(
      `/orgs/${orgSlug}/courses/${courseId}/mastery`,
    ),
  ]);

  profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  nextTask = nextTaskRes.status === "fulfilled" ? nextTaskRes.value : null;
  sectionProgress = sectionsRes.status === "fulfilled" ? sectionsRes.value : [];

  if (masteryRes.status === "fulfilled") {
    for (const state of masteryRes.value) {
      masteryMap.set(state.conceptId, state.masteryState);
    }
  }

  const academy = graph.course.academyId
    ? await serverApiFetch<AcademyDetail>(`/orgs/${orgSlug}/academies/${graph.course.academyId}`).catch(() => null)
    : null;

  const conceptsWithMastery = graph.concepts
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((concept) => ({
      ...concept,
      masteryState: masteryMap.get(concept.id) ?? ("unstarted" as MasteryState),
    }));

  const courseUnlocked = !!profile && (profile.diagnosticCompleted || profile.completionPercent > 0);
  const academyHref = academy ? getLearnAcademyHref(orgSlug, academy.slug) : getLearnOrgHref(orgSlug);
  const studyEntryHref = academy
    ? getLearnAcademyStudyHref(orgSlug, academy.slug)
    : getLearnCourseStudyHref(orgSlug, courseSlug);
  const diagnosticHref = academy
    ? getLearnAcademyDiagnosticHref(orgSlug, academy.slug)
    : getLearnCourseDiagnosticHref(orgSlug, courseSlug);

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
      <Link
        href={academyHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {academy ? "Back to Academy" : "Back to Learning Hub"}
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">{graph.course.name}</h1>
      {graph.course.description ? (
        <p className="text-muted-foreground mb-6">{graph.course.description}</p>
      ) : null}

      {profile ? (
        <div className="rounded-lg border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Course Progress</span>
            <Badge variant="secondary">{Math.round(profile.completionPercent)}%</Badge>
          </div>
          <Progress value={profile.completionPercent} className="h-2 mb-4" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{profile.mastered}</p>
              <p className="text-xs text-muted-foreground">Mastered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{profile.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{profile.needsReview}</p>
              <p className="text-xs text-muted-foreground">Needs Review</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{profile.unstarted}</p>
              <p className="text-xs text-muted-foreground">Not Started</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">{profile.certifiedSections ?? 0} certified sections</Badge>
            <Badge variant="outline">{profile.examReadySections ?? 0} exam-ready sections</Badge>
          </div>
        </div>
      ) : null}

      {courseUnlocked ? (
        <div className="rounded-lg border border-border p-6 mb-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Keep going</h2>
          <p className="text-sm text-muted-foreground mb-4">{primaryCTA.description}</p>
          <Button render={<Link href={primaryCTA.href} />}>{primaryCTA.label}</Button>
        </div>
      ) : (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 mb-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Start with a diagnostic</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We’ll place you at the right starting point and unlock the course graph.
          </p>
          <Button render={<Link href={diagnosticHref} />}>Take Diagnostic</Button>
        </div>
      )}

      {sectionProgress.length > 0 ? (
        <div className="mb-8 space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Sections</h2>
          <div className="space-y-3">
            {sectionProgress.map((section) => (
              <div key={section.sectionId} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground">{section.section.name}</h3>
                    {section.section.description ? (
                      <p className="text-sm text-muted-foreground mt-1">{section.section.description}</p>
                    ) : null}
                  </div>
                  <Badge variant={sectionStatusVariant[section.status]}>
                    {sectionStatusLabel[section.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Concepts</h2>
        <ConceptList
          concepts={conceptsWithMastery}
          sections={graph.sections}
          courseId={courseId}
          locked={!courseUnlocked}
          getConceptHref={(conceptId) => getLearnLessonHref(orgSlug, courseSlug, conceptId)}
        />
      </div>
    </div>
  );
}
