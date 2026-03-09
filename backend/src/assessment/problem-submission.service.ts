import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateXP, ActivityType } from './xp-calculator';
import { updateSpeed, deriveSpeed, blendSpeed, SpeedState, ConceptParams } from './speed-updater';

export interface SubmitAnswerInput {
  userId: string;
  problemId: string;
  answer: unknown;
  responseTimeMs: number;
  activityType: ActivityType;
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
}

@Injectable()
export class ProblemSubmissionService {
  constructor(private prisma: PrismaService) {}

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
          include: { concept: true },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Problem ${problemId} not found`);
    }

    const kp = problem.knowledgePoint;
    const concept = kp.concept;

    // 2. Evaluate the answer
    const evaluation = evaluateAnswer(
      problem.type,
      answer,
      problem.correctAnswer,
      problem.explanation ?? undefined,
    );

    // 3. Get current attempt count for this user+KP to determine attempt number
    const currentKPState = await this.prisma.studentKPState.findUnique({
      where: { userId_knowledgePointId: { userId, knowledgePointId: kp.id } },
    });

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

    // 6. Update StudentKPState
    const updatedKPState = await this.updateKPState(
      userId,
      kp.id,
      evaluation.correct,
    );

    // 7. Update StudentConceptState (mastery transitions + speed)
    const updatedMasteryState = await this.updateConceptState(
      userId,
      concept.id,
      concept.courseId,
      evaluation.correct,
      responseTimeMs,
      concept,
    );

    // 8. Award XP to enrollment
    if (xpResult.xp > 0) {
      await this.prisma.courseEnrollment.update({
        where: { userId_courseId: { userId, courseId: concept.courseId } },
        data: { totalXPEarned: { increment: xpResult.xp } },
      });
    }

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
    };
  }

  private async updateKPState(
    userId: string,
    knowledgePointId: string,
    correct: boolean,
  ) {
    const existing = await this.prisma.studentKPState.findUnique({
      where: { userId_knowledgePointId: { userId, knowledgePointId } },
    });

    const currentConsecutive = existing?.consecutiveCorrect ?? 0;
    const newConsecutive = correct ? currentConsecutive + 1 : 0;
    const passed = (existing?.passed ?? false) || newConsecutive >= 2;

    return this.prisma.studentKPState.upsert({
      where: { userId_knowledgePointId: { userId, knowledgePointId } },
      create: {
        userId,
        knowledgePointId,
        attempts: 1,
        consecutiveCorrect: correct ? 1 : 0,
        passed: correct ? false : false, // need 2 consecutive
        lastAttemptAt: new Date(),
      },
      update: {
        attempts: { increment: 1 },
        consecutiveCorrect: newConsecutive,
        passed,
        lastAttemptAt: new Date(),
      },
    });
  }

  private async updateConceptState(
    userId: string,
    conceptId: string,
    courseId: string,
    correct: boolean,
    responseTimeMs: number,
    concept: { difficulty: number; difficultyTheta: number; timeIntensity: number; timeIntensitySD: number },
  ) {
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    if (!conceptState) {
      throw new NotFoundException(`Student concept state not found for concept ${conceptId}`);
    }

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

    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        masteryState: newMasteryState,
        speed: effectiveSpeed,
        abilityTheta: updatedSpeed.abilityTheta,
        speedRD: updatedSpeed.speedRD,
        observationCount: updatedSpeed.observationCount,
        failCount: newFailCount,
        lastPracticedAt: new Date(),
      },
    });

    return newMasteryState;
  }

  private async checkAllKPsPassed(
    userId: string,
    conceptId: string,
  ): Promise<boolean> {
    const kps = await this.prisma.knowledgePoint.findMany({
      where: { conceptId },
      select: { id: true },
    });

    if (kps.length === 0) return false;

    const kpStates = await this.prisma.studentKPState.findMany({
      where: {
        userId,
        knowledgePointId: { in: kps.map((kp) => kp.id) },
      },
      select: { passed: true },
    });

    return (
      kpStates.length === kps.length && kpStates.every((s) => s.passed)
    );
  }
}
