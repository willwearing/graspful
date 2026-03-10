/** Shared mastery state used across components and pages */
export type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

export type ProblemType = "multiple_choice" | "fill_blank" | "true_false" | "ordering" | "matching" | "scenario";

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
