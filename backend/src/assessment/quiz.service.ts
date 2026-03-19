import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { XPService } from '@/gamification/xp.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateQuizXP } from './xp-calculator';
import {
  activeConceptWhere,
  activeKnowledgePointWhere,
} from '@/knowledge-graph/active-course-content';

export interface QuizSession {
  quizId: string;
  userId: string;
  courseId: string;
  problems: Array<{
    id: string;
    conceptId: string;
    questionText: string;
    type: string;
    options: unknown;
    correctAnswer: unknown;
    explanation: string | null;
  }>;
  answers: Array<{
    problemId: string;
    conceptId: string;
    correct: boolean;
    responseTimeMs: number;
  }>;
  startedAt: number;
  timeLimitMs: number;
  isComplete: boolean;
}

const QUIZ_TIME_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const MIN_QUIZ_QUESTIONS = 10;
const MAX_QUIZ_QUESTIONS = 15;

@Injectable()
export class QuizService {
  private sessions = new Map<string, QuizSession>();

  constructor(
    private prisma: PrismaService,
    private xpService: XPService,
  ) {}

  async generateQuiz(userId: string, courseId: string) {
    // Get the enrollment to check XP
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this course');
    }

    // Get concepts with mastery state for this student
    const conceptStates = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({ courseId }),
        masteryState: { in: ['in_progress', 'mastered'] },
      },
      include: { concept: true },
    });

    if (conceptStates.length === 0) {
      throw new BadRequestException('No concepts available for quiz');
    }

    // Select concepts near the student's ability level (~80% expected score)
    // Shuffle and pick from concepts that are in_progress or mastered
    const shuffled = conceptStates.sort(() => Math.random() - 0.5);
    const selectedConceptIds = shuffled
      .slice(0, MAX_QUIZ_QUESTIONS)
      .map((s) => s.conceptId);

    // Get one problem per selected concept
    const problems = await this.prisma.problem.findMany({
      where: {
        knowledgePoint: activeKnowledgePointWhere({
          conceptId: { in: selectedConceptIds },
        }),
      },
      include: {
        knowledgePoint: {
          select: { conceptId: true },
        },
      },
    });

    // Pick one problem per concept, preferring non-review variants
    const conceptProblemMap = new Map<string, typeof problems[0]>();
    for (const problem of problems) {
      const cid = problem.knowledgePoint.conceptId;
      const existing = conceptProblemMap.get(cid);
      if (!existing || (existing.isReviewVariant && !problem.isReviewVariant)) {
        conceptProblemMap.set(cid, problem);
      }
    }

    const quizProblems = Array.from(conceptProblemMap.values()).slice(
      0,
      MAX_QUIZ_QUESTIONS,
    );

    if (quizProblems.length < Math.min(MIN_QUIZ_QUESTIONS, conceptStates.length)) {
      throw new BadRequestException(
        `Not enough problems for a quiz (found ${quizProblems.length}, need ${MIN_QUIZ_QUESTIONS})`,
      );
    }

    const quizId = `quiz-${userId}-${courseId}-${Date.now()}`;
    const session: QuizSession = {
      quizId,
      userId,
      courseId,
      problems: quizProblems.map((p) => ({
        id: p.id,
        conceptId: p.knowledgePoint.conceptId,
        questionText: p.questionText,
        type: p.type,
        options: p.options,
        correctAnswer: p.correctAnswer,
        explanation: p.explanation,
      })),
      answers: [],
      startedAt: Date.now(),
      timeLimitMs: QUIZ_TIME_LIMIT_MS,
      isComplete: false,
    };

    this.sessions.set(quizId, session);

    // Return problems WITHOUT correct answers (closed-book)
    return {
      quizId,
      totalProblems: session.problems.length,
      timeLimitMs: QUIZ_TIME_LIMIT_MS,
      problems: session.problems.map((p) => ({
        id: p.id,
        questionText: p.questionText,
        type: p.type,
        options: p.options,
      })),
    };
  }

  async submitQuizAnswer(
    quizId: string,
    problemId: string,
    answer: unknown,
    responseTimeMs: number,
  ) {
    const session = this.sessions.get(quizId);
    if (!session) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }

    if (session.isComplete) {
      throw new BadRequestException('Quiz is already complete');
    }

    // Check time limit
    const elapsed = Date.now() - session.startedAt;
    if (elapsed > session.timeLimitMs) {
      throw new BadRequestException('Quiz time has expired');
    }

    // Find the problem in the session
    const problem = session.problems.find((p) => p.id === problemId);
    if (!problem) {
      throw new NotFoundException(`Problem ${problemId} not in this quiz`);
    }

    // Check if already answered
    if (session.answers.some((a) => a.problemId === problemId)) {
      throw new BadRequestException('Problem already answered');
    }

    // Evaluate (but no feedback during quiz)
    const evaluation = evaluateAnswer(
      problem.type,
      answer,
      problem.correctAnswer,
      problem.explanation ?? undefined,
    );

    session.answers.push({
      problemId,
      conceptId: problem.conceptId,
      correct: evaluation.correct,
      responseTimeMs,
    });

    // Create ProblemAttempt record
    await this.prisma.problemAttempt.create({
      data: {
        userId: session.userId,
        problemId,
        answer: answer as any,
        correct: evaluation.correct,
        responseTimeMs,
        xpAwarded: 0, // XP awarded on quiz completion, not per question
      },
    });

    return {
      answeredCount: session.answers.length,
      totalProblems: session.problems.length,
      // No feedback during quiz (closed-book)
    };
  }

  async completeQuiz(quizId: string) {
    const session = this.sessions.get(quizId);
    if (!session) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }

    session.isComplete = true;

    const correctCount = session.answers.filter((a) => a.correct).length;
    const totalCount = session.answers.length;
    const score = totalCount > 0 ? correctCount / totalCount : 0;

    // Per-concept breakdown
    const conceptResults = new Map<
      string,
      { correct: number; total: number }
    >();
    for (const answer of session.answers) {
      const existing = conceptResults.get(answer.conceptId) || {
        correct: 0,
        total: 0,
      };
      existing.total++;
      if (answer.correct) existing.correct++;
      conceptResults.set(answer.conceptId, existing);
    }

    // Failed concepts: schedule for review
    const failedConcepts: string[] = [];
    for (const [conceptId, result] of conceptResults) {
      if (result.correct / result.total < 0.5) {
        failedConcepts.push(conceptId);
      }
    }

    // Mark failed concepts as needs_review
    if (failedConcepts.length > 0) {
      await this.prisma.studentConceptState.updateMany({
        where: {
          userId: session.userId,
          conceptId: { in: failedConcepts },
        },
        data: {
          masteryState: 'needs_review',
        },
      });
    }

    // Calculate and award quiz XP
    const xpResult = calculateQuizXP(totalCount, correctCount);

    if (xpResult.xp > 0) {
      const recorded = await this.xpService.recordXPEvent({
        userId: session.userId,
        courseId: session.courseId,
        source: 'quiz',
        amount: xpResult.xp,
      });
      xpResult.xp = recorded.amount; // May be clamped by daily cap
    }

    // Clean up session
    this.sessions.delete(quizId);

    return {
      quizId,
      score,
      correctCount,
      totalCount,
      xpAwarded: xpResult.xp,
      failedConcepts,
      conceptBreakdown: Object.fromEntries(conceptResults),
      // Now include feedback for each question
      results: session.answers.map((a) => {
        const problem = session.problems.find((p) => p.id === a.problemId);
        return {
          problemId: a.problemId,
          correct: a.correct,
          feedback: a.correct
            ? 'Correct!'
            : `Incorrect.${problem?.explanation ? ' ' + problem.explanation : ''}`,
        };
      }),
    };
  }
}
