import { detectPlateau, findWeakPrerequisites } from './plateau-detector';
import {
  ConceptSnapshot,
  SimpleEdge,
  TaskRecommendation,
  QUIZ_XP_THRESHOLD,
  URGENT_REVIEW_MEMORY_THRESHOLD,
  STANDARD_REVIEW_MEMORY_THRESHOLD,
} from './types';

/**
 * Priority-based task selector. Evaluates priorities P1-P5 in order
 * and returns the first matching task recommendation.
 *
 * @param snapshots - All concept states for the student in this course
 * @param edges - Prerequisite edges for the course graph
 * @param frontier - Concept IDs at the knowledge frontier (prereqs met, not started)
 * @param xpSinceLastQuiz - XP earned since the student's last quiz
 */
export function selectNextTask(
  snapshots: ConceptSnapshot[],
  edges: SimpleEdge[],
  frontier: string[],
  xpSinceLastQuiz: number,
): TaskRecommendation {
  // P1: Remediation — plateaued concepts with weak prerequisites
  for (const snap of snapshots) {
    if (detectPlateau(snap)) {
      const weakPrereqs = findWeakPrerequisites(snap.conceptId, edges, snapshots);
      if (weakPrereqs.length > 0) {
        // Pick the weak prerequisite with the lowest memory
        const sorted = weakPrereqs
          .map((id) => snapshots.find((s) => s.conceptId === id))
          .filter((s): s is ConceptSnapshot => s !== undefined)
          .sort((a, b) => a.memory - b.memory);

        const target = sorted.length > 0 ? sorted[0] : undefined;
        return {
          taskType: 'remediation',
          conceptId: target?.conceptId ?? weakPrereqs[0],
          reason: `Remediate weak prerequisite for blocked concept ${snap.conceptId} (failed ${snap.failCount} times)`,
        };
      }
    }
  }

  // P2: Urgent reviews — memory < 0.3 on mastered/needs_review concepts
  const urgentReviews = snapshots
    .filter(
      (s) =>
        (s.masteryState === 'mastered' || s.masteryState === 'needs_review') &&
        s.memory < URGENT_REVIEW_MEMORY_THRESHOLD,
    )
    .sort((a, b) => a.memory - b.memory);

  if (urgentReviews.length > 0) {
    return {
      taskType: 'review',
      conceptId: urgentReviews[0].conceptId,
      reason: `urgent review: memory at ${urgentReviews[0].memory.toFixed(2)} (below ${URGENT_REVIEW_MEMORY_THRESHOLD})`,
    };
  }

  // P3: New lessons — concepts at the knowledge frontier
  if (frontier.length > 0) {
    return {
      taskType: 'lesson',
      conceptId: frontier[0],
      reason: `New lesson: next concept at knowledge frontier`,
    };
  }

  // P4: Standard reviews — memory >= 0.3 AND < 0.5 on mastered/needs_review concepts
  // (memory < 0.3 is already handled by P2 urgent reviews)
  const standardReviews = snapshots
    .filter(
      (s) =>
        (s.masteryState === 'mastered' || s.masteryState === 'needs_review') &&
        s.memory >= URGENT_REVIEW_MEMORY_THRESHOLD &&
        s.memory < STANDARD_REVIEW_MEMORY_THRESHOLD,
    )
    .sort((a, b) => a.memory - b.memory);

  if (standardReviews.length > 0) {
    return {
      taskType: 'review',
      conceptId: standardReviews[0].conceptId,
      reason: `Standard review: memory at ${standardReviews[0].memory.toFixed(2)} (below ${STANDARD_REVIEW_MEMORY_THRESHOLD})`,
    };
  }

  // P5: Quiz — when enough XP earned since last quiz
  if (xpSinceLastQuiz >= QUIZ_XP_THRESHOLD) {
    return {
      taskType: 'quiz',
      reason: `Quiz time: ${xpSinceLastQuiz} XP earned since last quiz (threshold: ${QUIZ_XP_THRESHOLD})`,
    };
  }

  // Fallback: suggest a quiz as a checkpoint (student is all caught up)
  return {
    taskType: 'quiz',
    reason: `All caught up! Take a quiz to test your knowledge`,
  };
}
