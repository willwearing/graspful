/** Shared mastery state used across components and pages */
export type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";
export type SectionMasteryState =
  | "locked"
  | "lesson_in_progress"
  | "exam_ready"
  | "certified"
  | "needs_review";
export type TaskType =
  | "lesson"
  | "review"
  | "quiz"
  | "remediation"
  | "section_exam";

export type ProblemType = "multiple_choice" | "fill_blank" | "true_false" | "ordering" | "matching" | "scenario";

export type RichContentBlock =
  | {
      type: "image";
      url: string;
      alt: string;
      caption?: string;
      width?: number;
    }
  | {
      type: "video";
      url: string;
      title: string;
      caption?: string;
    }
  | {
      type: "link";
      url: string;
      title: string;
      description?: string;
    }
  | {
      type: "callout";
      title: string;
      body: string;
    };

export interface Problem {
  id: string;
  questionText: string;
  type: ProblemType;
  options?: { id: string; text: string }[];
  items?: string[];
  pairs?: { left: string; right: string }[];
  difficulty: number;
}

export type ProblemAnswer = string | boolean | string[] | Record<string, string>;

export interface NextTask {
  taskType: TaskType;
  conceptId?: string;
  sectionId?: string;
  reason: string;
}

export interface SectionExamAttemptSummary {
  id: string;
  score: number | null;
  passed: boolean | null;
  completedAt: string | null;
  attemptNumber: number;
}

export interface SectionProgress {
  sectionId: string;
  status: SectionMasteryState;
  examPassedAt: string | null;
  attempts: number;
  section: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    sortOrder: number;
    sectionExamConfig?: {
      enabled?: boolean;
      passingScore?: number;
      timeLimitMinutes?: number;
      questionCount?: number;
      instructions?: string;
    } | null;
    concepts: Array<{ id: string; name: string }>;
  };
  conceptStates: Array<{
    conceptId: string;
    masteryState: MasteryState;
  }>;
  latestAttempt: SectionExamAttemptSummary | null;
}
