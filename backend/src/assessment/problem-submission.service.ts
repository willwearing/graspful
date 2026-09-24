import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
import { calculateRawDelta } from '@/spaced-repetition/fire-equations';
import { XPService } from '@/gamification/xp.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { currentSessionId } from '@/learning-engine/lesson-pause-policy';
import { detectKPPlateau } from '@/learning-engine/kp-plateau-detector';
import { RemediationService } from '@/learning-engine/remediation.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateXP } from './xp-calculator';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';
import { SectionExamService } from './section-exam.service';
import { AssessmentScopeService } from './assessment-scope.service';
import { withProblemSubmissionReceipt } from './problem-submission-receipt';
import { computeNextProblemHint } from './problem-submission-lesson';
import { updateSubmissionConceptState, updateSubmissionKPState } from './problem-submission-progress';
import type { SubmitAnswerInput, SubmitAnswerResult, NextProblemHint } from './problem-submission-types';

export type { SubmitAnswerInput, SubmitAnswerResult, NextProblemHint } from './problem-submission-types';

const logger = getLogger('assessment');

@Injectable()
export class ProblemSubmissionService {
  constructor(
    private prisma: PrismaService,
    private fireUpdate: FireUpdateService,
    private xpService: XPService,
    private sectionExamService: SectionExamService,
    private studentState: StudentStateService,
    private remediationService: RemediationService,
    private scope: AssessmentScopeService,
  ) {}

  async submitAnswer(input: SubmitAnswerInput): Promise<SubmitAnswerResult> {
    await this.scope.assertConcept(input.orgId, input.userId, input.courseId, input.conceptId);

    const result = await withProblemSubmissionReceipt(this.prisma, input, (attemptId, tx) =>
      this.applyAnswer(input, attemptId, tx),
    );

    // Section statuses are derived from committed mastery. A failed sync can be
    // retried with the saved result without applying the answer a second time.
    await this.sectionExamService.syncSectionStates(input.userId, input.courseId);
    return result;
  }

  private async applyAnswer(
    input: SubmitAnswerInput,
    attemptId: string,
    tx: Prisma.TransactionClient,
  ): Promise<SubmitAnswerResult> {
    const { userId, problemId, answer, responseTimeMs, activityType } = input;

    // 1. Fetch the problem with its KP and concept
    const problem = await tx.problem.findUnique({
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

    if (problem.isArchived || kp.isArchived || concept.isArchived || concept.section?.isArchived ||
        concept.id !== input.conceptId || concept.courseId !== input.courseId) {
      throw new NotFoundException(`Problem ${problemId} not found`);
    }

    // Resolve enrollment before creating an attempt or touching the learner model.
    if (!await this.studentState.getConceptState(userId, concept.id, tx)) {
      throw new NotFoundException('Enrollment state not found');
    }
    if (activityType === 'lesson') {
      if (concept.sectionId) {
        const sectionState = await this.studentState.getSectionState(userId, concept.sectionId, tx);
        if (sectionState?.status === 'locked') {
          throw new BadRequestException('Complete the previous section exam first');
        }
      }
      const blockedIds = await this.remediationService.getBlockedConceptIdsForCourse(userId, input.courseId, tx);
      if (blockedIds.has(concept.id)) {
        throw new BadRequestException('Complete prerequisite reviews first');
      }
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
    const currentKPState = await this.studentState.getKPState(userId, kp.id, tx);

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
    await tx.problemAttempt.create({
      data: {
        id: attemptId,
        userId,
        problemId,
        answer: answer as Prisma.InputJsonValue,
        correct: evaluation.correct,
        responseTimeMs,
        xpAwarded: xpResult.xp,
      },
    });

    // 6. Update StudentKPState (pass sessionId for Slice 3 failed-session tracking)
    const sessionIdNow = currentSessionId();
    const updatedKPState = await updateSubmissionKPState(
      this.studentState,
      userId,
      kp.id,
      evaluation.correct,
      sessionIdNow,
      tx,
    );

    // Slice 3 : after a miss, check whether this KP has plateaued across
    // multiple sessions. If so, create a key-prerequisite remediation.
    if (!evaluation.correct && kpKeyPrereqConceptId) {
      const academyId = concept.course?.academyId;
      if (academyId) {
        const refreshed = await this.studentState.getKPState(userId, kp.id, tx);
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
          await this.remediationService.createRemediation(
            userId,
            academyId,
            concept.id,
            kpKeyPrereqConceptId,
            concept.courseId,
            tx,
          );
        }
      }
    }

    // Capture pre-update memory for implicit repetition delta
    const preUpdateMemory = await this.studentState.getConceptMemory(userId, concept.id, tx);

    // 7. Update StudentConceptState (mastery transitions + speed)
    const updatedMasteryState = await updateSubmissionConceptState(
      this.studentState,
      userId,
      concept.id,
      evaluation.correct,
      responseTimeMs,
      concept,
      activityType !== 'review',
      tx,
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
        idempotencyKey: `problem-attempt:${attemptId}`,
      }, tx);
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
        tx,
      );
    }

    // Slice 1 : compute KP-level "more practice" hint for lesson submissions.
    let nextProblemHint: NextProblemHint | null = null;
    if (activityType === 'lesson') {
      nextProblemHint = await computeNextProblemHint(this.studentState, {
        userId,
        conceptId: concept.id,
        currentKPId: kp.id,
        lastProblemId: problemId,
        lastAnswerCorrect: evaluation.correct,
        seenProblemIds: input.seenProblemIds ?? [],
        workedExampleReopenedKPIds: input.workedExampleReopenedKPIds ?? [],
      }, tx);
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

}
