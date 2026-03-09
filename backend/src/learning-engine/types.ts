export type TaskType = 'lesson' | 'review' | 'quiz' | 'remediation';

export interface TaskRecommendation {
  taskType: TaskType;
  conceptId?: string;
  reason: string;
}

export interface StudySession {
  tasks: TaskRecommendation[];
  estimatedXP: number;
}

/**
 * Snapshot of a single concept's state, used by pure functions.
 * Mirrors the relevant fields from StudentConceptState.
 */
export interface ConceptSnapshot {
  conceptId: string;
  masteryState: 'unstarted' | 'in_progress' | 'mastered' | 'needs_review';
  memory: number;
  failCount: number;
}

/**
 * A prerequisite edge simplified for pure function consumption.
 */
export interface SimpleEdge {
  source: string;
  target: string;
}

/**
 * An active remediation: a blocked concept and its weak prerequisites.
 */
export interface RemediationRecord {
  id: string;
  blockedConceptId: string;
  weakPrerequisiteId: string;
  resolved: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
}

// XP thresholds and constants
export const QUIZ_XP_THRESHOLD = 150;
export const URGENT_REVIEW_MEMORY_THRESHOLD = 0.3;
export const STANDARD_REVIEW_MEMORY_THRESHOLD = 0.5;
export const PLATEAU_FAIL_COUNT_THRESHOLD = 2;
export const LESSON_XP_ESTIMATE = 15;
export const REVIEW_XP_ESTIMATE = 5;
export const QUIZ_XP_ESTIMATE = 20;
export const REMEDIATION_XP_ESTIMATE = 10;
