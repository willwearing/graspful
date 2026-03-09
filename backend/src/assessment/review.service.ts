import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ProblemSubmissionService } from './problem-submission.service';

export interface ReviewSession {
  conceptId: string;
  userId: string;
  problems: Array<{
    id: string;
    questionText: string;
    type: string;
    options: unknown;
    difficulty: number;
  }>;
  answers: Array<{
    problemId: string;
    correct: boolean;
  }>;
  isComplete: boolean;
}

@Injectable()
export class ReviewService {
  private sessions = new Map<string, ReviewSession>();

  constructor(
    private prisma: PrismaService,
    private problemSubmission: ProblemSubmissionService,
  ) {}

  async startReview(userId: string, conceptId: string) {
    // Verify concept exists and student has a concept state
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    if (!conceptState) {
      throw new NotFoundException(`No enrollment state for concept ${conceptId}`);
    }

    // Select 3-5 review problems from this concept's KPs
    const problems = await this.prisma.problem.findMany({
      where: {
        knowledgePoint: { conceptId },
        isReviewVariant: true,
      },
      take: 5,
      orderBy: { difficulty: 'asc' },
    });

    // Fall back to non-review problems if no review variants exist
    let selectedProblems = problems;
    if (selectedProblems.length < 3) {
      selectedProblems = await this.prisma.problem.findMany({
        where: {
          knowledgePoint: { conceptId },
        },
        take: 5,
        orderBy: { difficulty: 'asc' },
      });
    }

    if (selectedProblems.length === 0) {
      throw new NotFoundException(`No problems available for concept ${conceptId}`);
    }

    // Take 3-5 problems
    const finalProblems = selectedProblems.slice(
      0,
      Math.max(3, Math.min(5, selectedProblems.length)),
    );

    const sessionId = `review-${userId}-${conceptId}-${Date.now()}`;
    const session: ReviewSession = {
      conceptId,
      userId,
      problems: finalProblems.map((p) => ({
        id: p.id,
        questionText: p.questionText,
        type: p.type,
        options: p.options,
        difficulty: p.difficulty,
      })),
      answers: [],
      isComplete: false,
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      totalProblems: session.problems.length,
      currentProblem: session.problems[0],
      problemNumber: 1,
    };
  }

  async submitReviewAnswer(
    sessionId: string,
    problemId: string,
    answer: unknown,
    responseTimeMs: number,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Review session ${sessionId} not found`);
    }

    if (session.isComplete) {
      throw new NotFoundException('Review session is already complete');
    }

    // Submit the answer through the problem submission service
    const result = await this.problemSubmission.submitAnswer({
      userId: session.userId,
      problemId,
      answer,
      responseTimeMs,
      activityType: 'review',
    });

    session.answers.push({ problemId, correct: result.correct });

    const nextIndex = session.answers.length;
    const hasMore = nextIndex < session.problems.length;

    return {
      correct: result.correct,
      feedback: result.feedback,
      xpAwarded: result.xpAwarded,
      hasMore,
      nextProblem: hasMore ? session.problems[nextIndex] : null,
      problemNumber: nextIndex + 1,
      totalProblems: session.problems.length,
    };
  }

  async completeReview(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Review session ${sessionId} not found`);
    }

    session.isComplete = true;

    const correctCount = session.answers.filter((a) => a.correct).length;
    const totalCount = session.answers.length;
    const score = totalCount > 0 ? correctCount / totalCount : 0;
    const passed = score >= 0.6; // 60% pass threshold

    // Update concept mastery state based on review result
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: {
        userId_conceptId: {
          userId: session.userId,
          conceptId: session.conceptId,
        },
      },
    });

    if (conceptState) {
      if (passed) {
        // Review passed: stays mastered, repNum increases
        await this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: {
              userId: session.userId,
              conceptId: session.conceptId,
            },
          },
          data: {
            masteryState: 'mastered',
            repNum: { increment: 1 },
            lastPracticedAt: new Date(),
            failCount: 0,
          },
        });
      } else {
        // Review failed: needs_review
        await this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: {
              userId: session.userId,
              conceptId: session.conceptId,
            },
          },
          data: {
            masteryState: 'needs_review',
            failCount: { increment: 1 },
            lastPracticedAt: new Date(),
          },
        });
      }
    }

    // Clean up session
    this.sessions.delete(sessionId);

    return {
      conceptId: session.conceptId,
      passed,
      score,
      correctCount,
      totalCount,
      updatedMasteryState: passed ? 'mastered' : 'needs_review',
    };
  }
}
