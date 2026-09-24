import type { LessonStart } from "@graspful/shared";

export type LessonData = LessonStart;
export type KnowledgePoint = LessonStart["knowledgePoints"][number];

export interface LessonFlowProps {
  orgSlug: string;
  courseId: string;
  token: string;
  lesson: LessonData;
  continueHref?: string;
}

export type KPPhase = "instruction" | "worked-example" | "practice";

export interface NextProblemHint {
  targetKPId: string;
  nextProblemId: string | null;
  reopenWorkedExample: boolean;
  retryDelayMs: number;
  lessonComplete: boolean;
}
