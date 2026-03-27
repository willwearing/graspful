import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { ProblemSubmissionService } from './problem-submission.service';
import { SectionExamService } from './section-exam.service';
import { activeProblemWhere } from '@/knowledge-graph/active-course-content';
import {
  type ClientProblem,
  serializeProblemForClient,
} from '@/shared/utils/problem-presentation';

export interface ReviewSession {
  conceptId: string;
  userId: string;
  problems: ClientProblem[];
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
    private fireUpdate: FireUpdateService,
    private sectionExamService: SectionExamService,
    private studentState: StudentStateService,
  ) {}

  async startReview(userId: string, conceptId: string) {
    // Verify concept exists and student has a concept state
    const conceptState = await this.studentState.getConceptStateWithConcept(userId, conceptId);

    if (
      !conceptState ||
      !conceptState.concept ||
      conceptState.concept.isArchived ||
      conceptState.concept.section?.isArchived
    ) {
      throw new NotFoundException(`No enrollment state for concept ${conceptId}`);
    }

    // Select 3-5 review problems from this concept's KPs
    const problems = await this.prisma.problem.findMany({
      where: activeProblemWhere({
        knowledgePoint: { conceptId },
        isReviewVariant: true,
      }),
      take: 5,
      orderBy: { difficulty: 'asc' },
    });

    // Fall back to non-review problems if no review variants exist
    let selectedProblems = problems;
    if (selectedProblems.length < 3) {
      selectedProblems = await this.prisma.problem.findMany({
        where: activeProblemWhere({
          knowledgePoint: { conceptId },
        }),
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
      problems: finalProblems.map((problem) => serializeProblemForClient(problem)),
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

    // Get the concept's courseId and academyId for implicit propagation
    const concept = await this.prisma.concept.findUnique({
      where: { id: session.conceptId },
      select: { courseId: true, course: { select: { academyId: true } } },
    });

    // Update mastery state
    const conceptState = await this.studentState.getConceptState(
      session.userId,
      session.conceptId,
    );

    if (conceptState) {
      await this.studentState.updateConceptAfterPractice(
        session.userId,
        session.conceptId,
        {
          masteryState: passed ? 'mastered' : 'needs_review',
          failCount: passed ? 0 : conceptState.failCount + 1,
        },
      );
    }

    // FIRe update: update repNum, memory, interval + implicit propagation
    await this.fireUpdate.updateAfterReview(
      session.userId,
      session.conceptId,
      passed,
      score, // quality = accuracy ratio
      concept?.course?.academyId,
    );

    if (concept?.courseId) {
      await this.sectionExamService.syncSectionStates(
        session.userId,
        concept.courseId,
      );
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
