import { selectNextTask } from './task-selector';
import {
  ConceptSnapshot,
  SectionSnapshot,
  SimpleEdge,
  StudySession,
  TaskRecommendation,
  LESSON_XP_ESTIMATE,
  REVIEW_XP_ESTIMATE,
  QUIZ_XP_ESTIMATE,
  REMEDIATION_XP_ESTIMATE,
  SECTION_EXAM_XP_ESTIMATE,
} from './types';

const MAX_TASKS = 20;

function estimateTaskXP(taskType: string): number {
  switch (taskType) {
    case 'lesson':
      return LESSON_XP_ESTIMATE;
    case 'review':
      return REVIEW_XP_ESTIMATE;
    case 'remediation':
      return REMEDIATION_XP_ESTIMATE;
    case 'quiz':
      return QUIZ_XP_ESTIMATE;
    case 'section_exam':
      return SECTION_EXAM_XP_ESTIMATE;
    default:
      return 0;
  }
}

/**
 * Generate an ordered study session by repeatedly calling selectNextTask
 * until we hit the daily XP target or run out of things to do.
 *
 * @param snapshots - All concept states for the student
 * @param edges - Prerequisite edges for the course
 * @param frontier - Current knowledge frontier concept IDs
 * @param dailyXPTarget - How much XP the student wants to earn today
 * @param xpSinceLastQuiz - XP earned since the student's last quiz
 */
export function generateStudySession(
  snapshots: ConceptSnapshot[],
  sections: SectionSnapshot[],
  edges: SimpleEdge[],
  frontier: string[],
  dailyXPTarget: number,
  xpSinceLastQuiz: number,
): StudySession {
  const tasks: TaskRecommendation[] = [];
  let accumulatedXP = 0;
  let runningXPSinceQuiz = xpSinceLastQuiz;
  const usedConceptIds = new Set<string>();
  const remainingFrontier = [...frontier];

  while (accumulatedXP < dailyXPTarget && tasks.length < MAX_TASKS) {
    // Build a filtered snapshot/frontier for this iteration
    // Remove concepts already assigned in this session
    const availableFrontier = remainingFrontier.filter(
      (id) => !usedConceptIds.has(id),
    );

    const task = selectNextTask(
      snapshots.filter((s) => !usedConceptIds.has(s.conceptId)),
      sections,
      edges,
      availableFrontier,
      runningXPSinceQuiz,
    );

    // Guard against infinite loops: if the task selector returns
    // the same fallback quiz consecutively, stop
    const lastTask = tasks[tasks.length - 1];
    if (
      lastTask &&
      ((lastTask.taskType === 'quiz' &&
        lastTask.reason.includes('caught up') &&
        task.taskType === 'quiz' &&
        task.reason.includes('caught up')) ||
        (lastTask.taskType === 'section_exam' &&
          task.taskType === 'section_exam' &&
          lastTask.sectionId === task.sectionId))
    ) {
      break;
    }

    tasks.push(task);

    const xp = estimateTaskXP(task.taskType);
    accumulatedXP += xp;
    runningXPSinceQuiz += xp;

    // Track used concepts to avoid duplicates
    if (task.conceptId) {
      usedConceptIds.add(task.conceptId);
    }

    // Reset XP counter after a quiz
    if (task.taskType === 'quiz' || task.taskType === 'section_exam') {
      runningXPSinceQuiz = 0;
    }
  }

  return {
    tasks,
    estimatedXP: accumulatedXP,
  };
}
