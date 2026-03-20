import { detectPlateau, findWeakPrerequisites } from './plateau-detector';
import {
  ConceptSnapshot,
  SectionSnapshot,
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
  sections: SectionSnapshot[],
  edges: SimpleEdge[],
  frontier: string[],
  xpSinceLastQuiz: number,
  academyId = '',
): TaskRecommendation {
  const snapshotById = new Map(
    snapshots.map((snapshot) => [snapshot.conceptId, snapshot]),
  );
  const sectionById = new Map(
    sections.map((section) => [section.sectionId, section]),
  );
  const mostRecentCourseId = snapshots
    .filter((snapshot) => snapshot.lastPracticedAt)
    .sort(
      (left, right) =>
        (right.lastPracticedAt?.getTime() ?? 0) -
        (left.lastPracticedAt?.getTime() ?? 0),
    )[0]?.courseId;
  const masteredCountByCourse = new Map<string, number>();

  for (const snapshot of snapshots) {
    if (snapshot.masteryState !== 'mastered' || !snapshot.courseId) {
      continue;
    }

    masteredCountByCourse.set(
      snapshot.courseId,
      (masteredCountByCourse.get(snapshot.courseId) ?? 0) + 1,
    );
  }

  const fallbackCourseId =
    mostRecentCourseId ??
    sections.find((section) => section.status === 'exam_ready')?.courseId ??
    snapshots[0]?.courseId;

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
          academyId,
          courseId: target?.courseId ?? snap.courseId,
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
      academyId,
      courseId: urgentReviews[0].courseId,
      taskType: 'review',
      conceptId: urgentReviews[0].conceptId,
      reason: `urgent review: memory at ${urgentReviews[0].memory.toFixed(2)} (below ${URGENT_REVIEW_MEMORY_THRESHOLD})`,
    };
  }

  // P3: Ready section exams
  const readySection = sections
    .filter((section) => section.status === 'exam_ready')
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))[0];
  if (readySection) {
    return {
      academyId,
      courseId: readySection.courseId,
      taskType: 'section_exam',
      sectionId: readySection.sectionId,
      reason: `Section exam ready for section ${readySection.sectionId}`,
    };
  }

  // P4: New lessons — concepts at the knowledge frontier
  if (frontier.length > 0) {
    const frontierCandidates = frontier
      .map((conceptId) => snapshotById.get(conceptId))
      .filter((snapshot): snapshot is ConceptSnapshot => snapshot !== undefined);
    const scored = frontierCandidates
      .map((candidate) => ({
        candidate,
        score: scoreFrontierCandidate(
          candidate,
          sectionById,
          mostRecentCourseId,
          masteredCountByCourse,
        ),
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.candidate.conceptId.localeCompare(right.candidate.conceptId);
      });
    const nextLesson = scored[0]?.candidate;

    return {
      academyId,
      courseId: nextLesson?.courseId,
      taskType: 'lesson',
      conceptId: nextLesson?.conceptId ?? frontier[0],
      reason: `New lesson: best academy-frontier concept`,
    };
  }

  // P5: Standard reviews — memory >= 0.3 AND < 0.5 on mastered/needs_review concepts
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
      academyId,
      courseId: standardReviews[0].courseId,
      taskType: 'review',
      conceptId: standardReviews[0].conceptId,
      reason: `Standard review: memory at ${standardReviews[0].memory.toFixed(2)} (below ${STANDARD_REVIEW_MEMORY_THRESHOLD})`,
    };
  }

  // P6: Quiz — when enough XP earned since last quiz
  if (xpSinceLastQuiz >= QUIZ_XP_THRESHOLD) {
    return {
      academyId,
      courseId: fallbackCourseId,
      taskType: 'quiz',
      reason: `Quiz time: ${xpSinceLastQuiz} XP earned since last quiz (threshold: ${QUIZ_XP_THRESHOLD})`,
    };
  }

  // Fallback: suggest a quiz as a checkpoint (student is all caught up)
  return {
    academyId,
    courseId: fallbackCourseId,
    taskType: 'quiz',
    reason: `All caught up! Take a quiz to test your knowledge`,
  };
}

function scoreFrontierCandidate(
  candidate: ConceptSnapshot,
  sectionById: Map<string, SectionSnapshot>,
  mostRecentCourseId: string | undefined,
  masteredCountByCourse: Map<string, number>,
) {
  let score = 0;

  if (mostRecentCourseId && candidate.courseId === mostRecentCourseId) {
    score += 15;
  }

  const section = candidate.sectionId
    ? sectionById.get(candidate.sectionId)
    : undefined;
  if (section?.status === 'lesson_in_progress') {
    score += 10;
  }

  score += Math.max(0, 10 - (candidate.difficulty ?? 5));
  score += 5 / ((masteredCountByCourse.get(candidate.courseId ?? '') ?? 0) + 1);

  return score;
}
