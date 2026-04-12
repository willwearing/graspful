import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
import { calculateRawDelta } from '@/spaced-repetition/fire-equations';
import { XPService } from '@/gamification/xp.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateXP, ActivityType } from './xp-calculator';
import { updateSpeed, deriveSpeed, blendSpeed, SpeedState, ConceptParams } from './speed-updater';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';
import { SectionExamService } from './section-exam.service';
import {
  selectNextKPProblem,
  type ProblemBankEntry,
  type KPStateSnapshot,
} from './kp-remediation-selector';
import {
  shouldPauseLesson,
  currentSessionId,
} from '@/learning-engine/lesson-pause-policy';
import { detectKPPlateau } from '@/learning-engine/kp-plateau-detector';
import { RemediationService } from '@/learning-engine/remediation.service';
import {
  activeKnowledgePointWhere,
  activeProblemWhere,
} from '@/knowledge-graph/active-course-content';

const logger = getLogger('assessment');

export interface SubmitAnswerInput {
  userId: string;
  problemId: string;
  answer: unknown;
  responseTimeMs: number;
  activityType: ActivityType;
  /**
   * Problem IDs the learner has already seen during this lesson session.
   * Used by the KPRemediationSelector to avoid repeating problems and to
   * trigger anti-gaming retry delays. Optional for callers that are not
   * driving a lesson-flow loop (e.g. reviews, section exams).
   */
  seenProblemIds?: string[];
  /**
   * KPs for which the worked example has already been re-opened once in
   * this session. Matches the risk-mitigation rule: "only auto-expand on
   * the first miss per KP per session; subsequent misses collapse it."
   */
  workedExampleReopenedKPIds?: string[];
}

export interface NextProblemHint {
  /** The KP the next problem must target (same KP on miss; next KP on pass). */
  targetKPId: string;
  /** The concrete problem id to fetch next, or null if the lesson is complete. */
  nextProblemId: string | null;
  /** True if the lesson loop should re-surface the worked example panel. */
  reopenWorkedExample: boolean;
  /** Anti-gaming retry delay in ms; 0 if none. */
  retryDelayMs: number;
  /** True when every KP in the lesson has been passed. */
  lessonComplete: boolean;
}

export interface SubmitAnswerResult {
  correct: boolean;
  feedback: string;
  xpAwarded: number;
  antiGamingTriggered: boolean;
  updatedKPState: {
    passed: boolean;
    attempts: number;
    consecutiveCorrect: number;
  };
  updatedMasteryState: string;
  /**
   * Slice 1 — KP-level "more practice" loop. When the submission was part
   * of a lesson practice loop, the service returns a hint describing which
   * KP the next problem should target and which concrete problem to load.
   *
   * Null for non-lesson submissions (reviews, quiz questions, exams) where
   * task selection lives elsewhere.
   */
  nextProblemHint: NextProblemHint | null;
}

@Injectable()
export class ProblemSubmissionService {
  constructor(
    private prisma: PrismaService,
    private fireUpdate: FireUpdateService,
    private xpService: XPService,
    private sectionExamService: SectionExamService,
    private studentState: StudentStateService,
    private remediationService: RemediationService,
  ) {}

  async submitAnswer(input: SubmitAnswerInput): Promise<SubmitAnswerResult> {
    const { userId, problemId, answer, responseTimeMs, activityType } = input;

    if (responseTimeMs <= 0) {
      throw new BadRequestException('Response time must be positive');
    }

    // 1. Fetch the problem with its KP and concept
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        knowledgePoint: {
          include: {
            concept: {
              include: {
                section: true,
                course: { select: { academyId: true } },
              },
            },
          },
        },
      },
    });
    // Slice 3 uses `knowledgePoint.keyPrerequisiteConceptId`. Treat it as
    // an optional field to stay tolerant of test mocks that pre-date the
    // schema change.
    const kpKeyPrereqConceptId =
      (problem?.knowledgePoint as
        | { keyPrerequisiteConceptId?: string | null }
        | undefined)?.keyPrerequisiteConceptId ?? null;

    if (!problem) {
      throw new NotFoundException(`Problem ${problemId} not found`);
    }

    const kp = problem.knowledgePoint;
    const concept = kp.concept;

    if (problem.isArchived || kp.isArchived || concept.isArchived || concept.section?.isArchived) {
      throw new NotFoundException(`Problem ${problemId} not found`);
    }

    // 2. Evaluate the answer
    const evaluation = evaluateAnswer(
      problem.type,
      answer,
      problem.correctAnswer,
      problem.explanation ?? undefined,
      problem.options as unknown[] | null,
    );

    // 3. Get current attempt count for this user+KP to determine attempt number
    const currentKPState = await this.studentState.getKPState(userId, kp.id);

    const attemptNumber = (currentKPState?.attempts ?? 0) + 1;

    // 4. Calculate XP
    const xpResult = calculateXP({
      activityType,
      difficulty: concept.difficulty,
      correct: evaluation.correct,
      responseTimeMs,
      attemptNumber,
    });

    // 5. Create ProblemAttempt record
    await this.prisma.problemAttempt.create({
      data: {
        userId,
        problemId,
        answer: answer as any,
        correct: evaluation.correct,
        responseTimeMs,
        xpAwarded: xpResult.xp,
      },
    });

    // 6. Update StudentKPState (pass sessionId for Slice 3 failed-session tracking)
    const sessionIdNow = currentSessionId();
    const updatedKPState = await this.updateKPState(
      userId,
      kp.id,
      evaluation.correct,
      sessionIdNow,
    );

    // Slice 3 — after a miss, check whether this KP has plateaued across
    // multiple sessions. If so, create a key-prerequisite remediation.
    if (!evaluation.correct && kpKeyPrereqConceptId) {
      const academyId = concept.course?.academyId;
      if (academyId) {
        const refreshed = await this.prisma.studentKPState.findUnique({
          where: {
            userId_knowledgePointId: {
              userId,
              knowledgePointId: kp.id,
            },
          },
          select: {
            attempts: true,
            passed: true,
            firstFailedSessionId: true,
            lastFailedSessionId: true,
          },
        });
        const plateaued = detectKPPlateau({
          attempts: refreshed?.attempts ?? 0,
          passed: refreshed?.passed ?? false,
          failedSessionIds: [
            refreshed?.firstFailedSessionId,
            refreshed?.lastFailedSessionId,
          ].filter((v): v is string => typeof v === 'string'),
          keyPrerequisiteConceptId: kpKeyPrereqConceptId,
        });
        if (plateaued) {
          try {
            await this.remediationService.createRemediation(
              userId,
              academyId,
              concept.id,
              kpKeyPrereqConceptId,
              concept.courseId,
            );
          } catch (err) {
            logger.emit({
              severityNumber: SeverityNumber.WARN,
              severityText: 'WARN',
              body: 'Failed to create KP-plateau remediation',
              attributes: {
                'user.id': userId,
                'concept.id': concept.id,
                'kp.id': kp.id,
                error: String(err),
              },
            });
          }
        }
      }
    }

    // Capture pre-update memory for implicit repetition delta
    const preUpdateMemory = await this.studentState.getConceptMemory(userId, concept.id);

    // 7. Update StudentConceptState (mastery transitions + speed)
    const updatedMasteryState = await this.updateConceptState(
      userId,
      concept.id,
      concept.courseId,
      evaluation.correct,
      responseTimeMs,
      concept,
    );

    // 8. Record XP event (handles enrollment update + daily cap + streak tracking)
    const academyId = concept.course?.academyId;
    if (xpResult.xp > 0) {
      const recorded = await this.xpService.recordXPEvent({
        userId,
        academyId,
        courseId: concept.courseId,
        source: activityType === 'lesson' ? 'lesson' : 'review',
        amount: xpResult.xp,
        conceptId: concept.id,
      });
      xpResult.xp = recorded.amount; // May be clamped by daily cap
    }

    // 9. Propagate implicit repetition to encompassed concepts
    if (academyId) {
      const implicitRawDelta = calculateRawDelta(
        evaluation.correct,
        evaluation.correct ? 1.0 : 0,
        preUpdateMemory,
      );
      await this.fireUpdate.propagateImplicitRepetition(
        userId,
        concept.id,
        implicitRawDelta,
        academyId,
      );
    }

    await this.sectionExamService.syncSectionStates(userId, concept.courseId);

    // Slice 1 — compute KP-level "more practice" hint for lesson submissions.
    let nextProblemHint: NextProblemHint | null = null;
    if (activityType === 'lesson') {
      try {
        nextProblemHint = await this.computeNextProblemHint({
          userId,
          conceptId: concept.id,
          currentKPId: kp.id,
          lastProblemId: problemId,
          lastAnswerCorrect: evaluation.correct,
          seenProblemIds: input.seenProblemIds ?? [],
          workedExampleReopenedKPIds: input.workedExampleReopenedKPIds ?? [],
        });
      } catch (err) {
        logger.emit({
          severityNumber: SeverityNumber.WARN,
          severityText: 'WARN',
          body: 'Failed to compute next problem hint',
          attributes: {
            'user.id': userId,
            'problem.id': problemId,
            error: String(err),
          },
        });
      }
    }

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Answer evaluated`,
      attributes: {
        'user.id': userId,
        'problem.id': problemId,
        'answer.correct': evaluation.correct,
        'xp.awarded': xpResult.xp,
        'mastery.state': updatedMasteryState,
      },
    });

    return {
      correct: evaluation.correct,
      feedback: evaluation.feedback,
      xpAwarded: xpResult.xp,
      antiGamingTriggered: xpResult.antiGamingTriggered,
      updatedKPState: {
        passed: updatedKPState.passed,
        attempts: updatedKPState.attempts,
        consecutiveCorrect: updatedKPState.consecutiveCorrect,
      },
      updatedMasteryState,
      nextProblemHint,
    };
  }

  /**
   * Build the `NextProblemHint` for a lesson practice submission by loading
   * all active KPs + problems for the concept, projecting their current
   * StudentKPState, and delegating the decision to the pure
   * `selectNextKPProblem` function.
   */
  private async computeNextProblemHint(args: {
    userId: string;
    conceptId: string;
    currentKPId: string;
    lastProblemId: string;
    lastAnswerCorrect: boolean;
    seenProblemIds: string[];
    workedExampleReopenedKPIds: string[];
  }): Promise<NextProblemHint | null> {
    const kps = await this.prisma.knowledgePoint.findMany({
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

    const kpStates = await this.prisma.studentKPState.findMany({
      where: {
        userId: args.userId,
        knowledgePointId: { in: kps.map((kp) => kp.id) },
      },
      select: {
        knowledgePointId: true,
        passed: true,
        consecutiveCorrect: true,
        attempts: true,
      },
    });
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

  private async updateKPState(
    userId: string,
    knowledgePointId: string,
    correct: boolean,
    sessionId?: string,
  ) {
    const existing = await this.studentState.getKPState(userId, knowledgePointId);
    const rawExisting = existing as
      | (typeof existing & { firstFailedSessionId?: string | null })
      | null;

    return this.studentState.upsertKPState(
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
    );
  }

  private async updateConceptState(
    userId: string,
    conceptId: string,
    courseId: string,
    correct: boolean,
    responseTimeMs: number,
    concept: { difficulty: number; difficultyTheta: number; timeIntensity: number; timeIntensitySD: number },
  ) {
    const conceptState = await this.studentState.getConceptState(userId, conceptId);

    if (!conceptState) {
      throw new NotFoundException(`Student concept state not found for concept ${conceptId}`);
    }

    // Slice 2 — session-level failed-KP-attempt counter drives lesson pause.
    // We reset the counter when the concept rolls into a new session so the
    // policy operates on "how stuck am I *right now*", not lifetime failures.
    const nowSessionId = currentSessionId();
    const rawState = conceptState as typeof conceptState & {
      pausedAtSessionId?: string | null;
      sessionFailedKPAttempts?: number | null;
    };
    const wasPausedThisSession =
      rawState.pausedAtSessionId === nowSessionId;
    const carriedSessionFailures = wasPausedThisSession
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
      const allKPsPassed = await this.checkAllKPsPassed(userId, conceptId);
      if (allKPsPassed && conceptState.masteryState !== 'mastered') {
        newMasteryState = 'mastered';
      }
    }

    // Slice 2 — decide whether to pause the lesson.
    const hasUnpassedKPs = !(await this.checkAllKPsPassed(userId, conceptId));
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

    await this.studentState.updateConceptAfterPractice(userId, conceptId, {
      masteryState: newMasteryState,
      speed: effectiveSpeed,
      abilityTheta: updatedSpeed.abilityTheta,
      speedRD: updatedSpeed.speedRD,
      observationCount: updatedSpeed.observationCount,
      failCount: newFailCount,
      lastPracticedAt: new Date(),
      pausedAtSessionId,
      sessionFailedKPAttempts: nextSessionFailedAttempts,
    });

    return newMasteryState;
  }

  private async checkAllKPsPassed(
    userId: string,
    conceptId: string,
  ): Promise<boolean> {
    const kps = await this.prisma.knowledgePoint.findMany({
      where: activeKnowledgePointWhere({ conceptId }),
      select: { id: true },
    });

    if (kps.length === 0) return false;

    const kpStates = await this.studentState.getKPStatesForIds(
      userId,
      kps.map((kp) => kp.id),
    );

    return (
      kpStates.length === kps.length && kpStates.every((s) => s.passed)
    );
  }
}
