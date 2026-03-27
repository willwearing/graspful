export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

export type SectionMasteryState =
  | "locked"
  | "lesson_in_progress"
  | "exam_ready"
  | "certified"
  | "needs_review";

export type TaskType = "lesson" | "review" | "quiz" | "remediation" | "section_exam";

export type ProblemType =
  | "multiple_choice"
  | "fill_blank"
  | "true_false"
  | "ordering"
  | "matching"
  | "scenario";

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
  academyId?: string;
  courseId?: string;
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

export interface CourseProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
  diagnosticCompleted?: boolean;
  certifiedSections?: number;
  examReadySections?: number;
}

export interface KnowledgeGraphCourse {
  academyId?: string | null;
  id: string;
  name: string;
  description: string | null;
}

export interface KnowledgeGraphSection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  sectionExam?: {
    enabled?: boolean;
    passingScore?: number;
    timeLimitMinutes?: number;
    questionCount?: number;
    instructions?: string;
  } | null;
}

export interface KnowledgeGraphConcept {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  sortOrder: number;
  slug: string;
  sectionId: string | null;
  courseId?: string;
  masteryState?: MasteryState;
}

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  masteryState: MasteryState;
  courseId?: string;
}

export interface KnowledgeGraphEdge {
  sourceConceptId: string;
  targetConceptId: string;
}

export interface CourseGraph {
  course: KnowledgeGraphCourse;
  sections: KnowledgeGraphSection[];
  concepts: KnowledgeGraphConcept[];
  prerequisiteEdges?: KnowledgeGraphEdge[];
  encompassingEdges?: KnowledgeGraphEdge[];
}

export interface KnowledgeGraphData {
  concepts: KnowledgeGraphConcept[];
  prerequisiteEdges?: KnowledgeGraphEdge[];
  encompassingEdges?: KnowledgeGraphEdge[];
  edges?: KnowledgeGraphEdge[];
}

export interface AcademyCourse {
  id: string;
  academyId: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface AcademyDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface AcademyProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
  diagnosticCompleted: boolean;
  activeCourses: number;
  completedCourses: number;
}

export interface DailyXP {
  date: string;
  xp: number;
}

export interface XPSummary {
  today: number;
  thisWeek: number;
  total: number;
  dailyTarget: number;
  dailyCap: number;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  todayComplete: boolean;
  todayXP: number;
  dailyTarget: number;
  freezeTokensRemaining: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyXP: number;
}

export interface CompletionEstimate {
  completionPercent: number;
  totalConcepts: number;
  masteredConcepts: number;
  remainingConcepts: number;
  averageDailyXP: number;
  estimatedWeeksRemaining: number | null;
  dailyXPTarget: number;
}

export interface StatsResponse extends CompletionEstimate {}
