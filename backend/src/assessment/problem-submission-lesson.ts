import { Prisma } from '@prisma/client';
import { StudentStateService } from '@/student-model/student-state.service';
import { activeKnowledgePointWhere, activeProblemWhere } from '@/knowledge-graph/active-course-content';
import { selectNextKPProblem, type ProblemBankEntry, type KPStateSnapshot } from './kp-remediation-selector';
import type { NextProblemHint } from './problem-submission-types';

/**
 * Build the `NextProblemHint` for a lesson practice submission by loading
 * all active KPs + problems for the concept, projecting their current
 * StudentKPState, and delegating the decision to the pure
 * `selectNextKPProblem` function.
 */
export async function computeNextProblemHint(
  studentState: StudentStateService,
  args: {
    userId: string;
    conceptId: string;
    currentKPId: string;
    lastProblemId: string;
    lastAnswerCorrect: boolean;
    seenProblemIds: string[];
    workedExampleReopenedKPIds: string[];
  },
  tx: Prisma.TransactionClient,
): Promise<NextProblemHint | null> {
  const kps = await tx.knowledgePoint.findMany({
    where: activeKnowledgePointWhere({ conceptId: args.conceptId }),
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      sortOrder: true,
      problems: {
        where: activeProblemWhere({ isReviewVariant: false }),
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      },
    },
  });

  if (kps.length === 0) return null;

  const kpStates = await studentState.getKPStatesForIds(
    args.userId,
    kps.map((kp) => kp.id),
    tx,
  );
  const kpStateById = new Map(kpStates.map((s) => [s.knowledgePointId, s]));

  const problemBank: ProblemBankEntry[] = [];
  const kpStateSnapshots: KPStateSnapshot[] = [];

  for (const kp of kps) {
    kpStateSnapshots.push({
      knowledgePointId: kp.id,
      sortOrder: kp.sortOrder,
      passed: kpStateById.get(kp.id)?.passed ?? false,
      consecutiveCorrect:
        kpStateById.get(kp.id)?.consecutiveCorrect ?? 0,
      attempts: kpStateById.get(kp.id)?.attempts ?? 0,
    });
    kp.problems.forEach((p, idx) => {
      problemBank.push({
        problemId: p.id,
        knowledgePointId: kp.id,
        sortOrder: idx,
      });
    });
  }

  const result = selectNextKPProblem({
    currentKPId: args.currentKPId,
    lastProblemId: args.lastProblemId,
    lastAnswerCorrect: args.lastAnswerCorrect,
    problemBank,
    kpStates: kpStateSnapshots,
    seenProblemIdsThisSession: new Set(args.seenProblemIds),
    workedExampleAlreadyReopenedForKP: new Set(
      args.workedExampleReopenedKPIds,
    ),
  });

  return {
    targetKPId: result.targetKPId,
    nextProblemId: result.nextProblemId,
    reopenWorkedExample: result.reopenWorkedExample,
    retryDelayMs: result.retryDelayMs,
    lessonComplete: result.lessonComplete,
  };
}
