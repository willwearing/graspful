import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StudentStateService } from '@/student-model/student-state.service';
import { shouldPauseLesson, currentSessionId } from '@/learning-engine/lesson-pause-policy';
import { activeKnowledgePointWhere } from '@/knowledge-graph/active-course-content';
import { updateSpeed, deriveSpeed, blendSpeed, type SpeedState, type ConceptParams } from './speed-updater';

export async function updateSubmissionKPState(
  studentState: StudentStateService,
  userId: string,
  knowledgePointId: string,
  correct: boolean,
  sessionId: string,
  tx: Prisma.TransactionClient,
) {
  const existing = await studentState.getKPState(userId, knowledgePointId, tx);
  const rawExisting = existing as
    | (typeof existing & { firstFailedSessionId?: string | null })
    | null;

  return studentState.upsertKPState(
    userId,
    knowledgePointId,
    correct,
    rawExisting
      ? {
          consecutiveCorrect: rawExisting.consecutiveCorrect,
          passed: rawExisting.passed,
          firstFailedSessionId: rawExisting.firstFailedSessionId ?? null,
        }
      : undefined,
    sessionId,
    tx,
  );
}

export async function updateSubmissionConceptState(
  studentState: StudentStateService,
  userId: string,
  conceptId: string,
  correct: boolean,
  responseTimeMs: number,
  concept: { difficulty: number; difficultyTheta: number; timeIntensity: number; timeIntensitySD: number },
  allowMasteryPromotion: boolean,
  tx: Prisma.TransactionClient,
) {
  const conceptState = await studentState.getConceptState(userId, conceptId, tx);

  if (!conceptState) {
    throw new NotFoundException(`Student concept state not found for concept ${conceptId}`);
  }

  // The counter belongs to the UTC practice session, including answers
  // recorded before the lesson reaches the pause threshold.
  const now = new Date();
  const nowSessionId = currentSessionId(now);
  const rawState = conceptState as typeof conceptState & {
    pausedAtSessionId?: string | null;
    sessionFailedKPAttempts?: number | null;
  };
  const wasPausedThisSession =
    rawState.pausedAtSessionId === nowSessionId;
  const wasPracticedThisSession = rawState.lastPracticedAt != null &&
    currentSessionId(rawState.lastPracticedAt) === nowSessionId;
  const carriedSessionFailures = wasPracticedThisSession || wasPausedThisSession
    ? rawState.sessionFailedKPAttempts ?? 0
    : 0;
  const nextSessionFailedAttempts = correct
    ? carriedSessionFailures
    : carriedSessionFailures + 1;

  // Update speed parameters
  const speedState: SpeedState = {
    abilityTheta: conceptState.abilityTheta,
    speedRD: conceptState.speedRD,
    observationCount: conceptState.observationCount,
  };

  const conceptParams: ConceptParams = {
    difficultyTheta: concept.difficultyTheta,
    timeIntensity: concept.timeIntensity || Math.log(10),
    timeIntensitySD: concept.timeIntensitySD || 0.8,
  };

  const updatedSpeed = updateSpeed(speedState, { correct, responseTimeMs }, conceptParams);
  const rawSpeed = deriveSpeed(updatedSpeed.abilityTheta, concept.difficultyTheta);
  const effectiveSpeed = blendSpeed(rawSpeed, updatedSpeed.observationCount);

  const allKPsPassed = await checkAllKPsPassed(studentState, userId, conceptId, tx);

  // Mastery state transitions
  let newMasteryState = conceptState.masteryState;
  let newFailCount = conceptState.failCount;

  if (conceptState.masteryState === 'unstarted') {
    newMasteryState = 'in_progress';
  }

  if (!correct) {
    newFailCount = conceptState.failCount + 1;
    if (conceptState.masteryState === 'mastered') {
      newMasteryState = 'needs_review';
    }
  } else {
    newFailCount = 0;
    // Check if all KPs passed -> mastered
    if (allowMasteryPromotion && allKPsPassed && conceptState.masteryState !== 'mastered') {
      newMasteryState = 'mastered';
    }
  }

  // Decide whether to pause the lesson.
  const hasUnpassedKPs = !allKPsPassed;
  const pauseNow = shouldPauseLesson({
    sessionFailedKPAttempts: nextSessionFailedAttempts,
    hasUnpassedKPs,
    masteryState: newMasteryState as
      | 'unstarted'
      | 'in_progress'
      | 'mastered'
      | 'needs_review',
  });
  const pausedAtSessionId = pauseNow
    ? nowSessionId
    : wasPausedThisSession
      ? rawState.pausedAtSessionId ?? null
      : null;

  await studentState.updateConceptAfterPractice(userId, conceptId, {
    masteryState: newMasteryState,
    speed: effectiveSpeed,
    abilityTheta: updatedSpeed.abilityTheta,
    speedRD: updatedSpeed.speedRD,
    observationCount: updatedSpeed.observationCount,
    failCount: newFailCount,
    lastPracticedAt: now,
    pausedAtSessionId,
    sessionFailedKPAttempts: nextSessionFailedAttempts,
  }, tx);

  return newMasteryState;
}

async function checkAllKPsPassed(
  studentState: StudentStateService,
  userId: string,
  conceptId: string,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const kps = await tx.knowledgePoint.findMany({
    where: activeKnowledgePointWhere({ conceptId }),
    select: { id: true },
  });

  if (kps.length === 0) return false;

  const kpStates = await studentState.getKPStatesForIds(
    userId,
    kps.map((kp) => kp.id),
    tx,
  );

  return (
    kpStates.length === kps.length && kpStates.every((s) => s.passed)
  );
}
