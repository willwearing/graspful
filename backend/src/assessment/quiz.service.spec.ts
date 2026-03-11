import { QuizService } from './quiz.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('QuizService', () => {
  let service: QuizService;
  let mockPrisma: any;
  let mockXPService: any;

  const mockConceptStates = [
    { conceptId: 'c1', masteryState: 'mastered', concept: { id: 'c1', courseId: 'course-1' } },
    { conceptId: 'c2', masteryState: 'in_progress', concept: { id: 'c2', courseId: 'course-1' } },
    { conceptId: 'c3', masteryState: 'mastered', concept: { id: 'c3', courseId: 'course-1' } },
  ];

  const mockProblems = [
    {
      id: 'p1', type: 'multiple_choice', questionText: 'Q1', options: ['A', 'B'],
      correctAnswer: 'A', explanation: 'Exp1', difficulty: 3, isReviewVariant: false,
      knowledgePoint: { conceptId: 'c1' },
    },
    {
      id: 'p2', type: 'true_false', questionText: 'Q2', options: null,
      correctAnswer: true, explanation: 'Exp2', difficulty: 2, isReviewVariant: false,
      knowledgePoint: { conceptId: 'c2' },
    },
    {
      id: 'p3', type: 'fill_blank', questionText: 'Q3', options: null,
      correctAnswer: '42', explanation: 'Exp3', difficulty: 4, isReviewVariant: false,
      knowledgePoint: { conceptId: 'c3' },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      courseEnrollment: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'user-1', courseId: 'course-1', totalXPEarned: 200 }),
        update: jest.fn().mockResolvedValue({}),
      },
      studentConceptState: {
        findMany: jest.fn().mockResolvedValue(mockConceptStates),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      problem: {
        findMany: jest.fn().mockResolvedValue(mockProblems),
      },
      problemAttempt: {
        create: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
      },
    };

    mockXPService = {
      recordXPEvent: jest.fn().mockResolvedValue({ amount: 20 }),
    };

    service = new QuizService(mockPrisma, mockXPService);
  });

  describe('generateQuiz', () => {
    it('should generate a quiz with problems', async () => {
      const result = await service.generateQuiz('user-1', 'course-1');

      expect(result.quizId).toBeDefined();
      expect(result.totalProblems).toBeGreaterThan(0);
      expect(result.timeLimitMs).toBe(15 * 60 * 1000);
      // Should not include correct answers
      for (const p of result.problems) {
        expect((p as any).correctAnswer).toBeUndefined();
      }
    });

    it('should throw when not enrolled', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.generateQuiz('user-1', 'course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when no concepts available', async () => {
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);

      await expect(
        service.generateQuiz('user-1', 'course-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitQuizAnswer', () => {
    it('should record answer without feedback', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');
      const firstProblem = quiz.problems[0];

      const result = await service.submitQuizAnswer(
        quiz.quizId,
        firstProblem.id,
        'A',
        5000,
      );

      expect(result.answeredCount).toBe(1);
      expect(result.totalProblems).toBe(quiz.totalProblems);
      // No feedback during quiz
      expect((result as any).feedback).toBeUndefined();
      expect((result as any).correct).toBeUndefined();
    });

    it('should throw for non-existent quiz', async () => {
      await expect(
        service.submitQuizAnswer('fake-quiz', 'p1', 'A', 5000),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw for already answered problem', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');
      const firstProblem = quiz.problems[0];

      await service.submitQuizAnswer(quiz.quizId, firstProblem.id, 'A', 5000);

      await expect(
        service.submitQuizAnswer(quiz.quizId, firstProblem.id, 'A', 5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when quiz time has expired', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');
      const firstProblem = quiz.problems[0];

      // Fast-forward past the time limit by manipulating the session
      const session = (service as any).sessions.get(quiz.quizId);
      session.startedAt = Date.now() - 16 * 60 * 1000; // 16 minutes ago

      await expect(
        service.submitQuizAnswer(quiz.quizId, firstProblem.id, 'A', 5000),
      ).rejects.toThrow('Quiz time has expired');
    });

    it('should throw when submitting to a completed quiz', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');
      const firstProblem = quiz.problems[0];

      await service.submitQuizAnswer(quiz.quizId, firstProblem.id, 'A', 5000);
      await service.completeQuiz(quiz.quizId);

      await expect(
        service.submitQuizAnswer(quiz.quizId, quiz.problems[1]?.id || 'p2', 'A', 5000),
      ).rejects.toThrow(NotFoundException); // session deleted after completion
    });

    it('should throw for problem not in this quiz', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');

      await expect(
        service.submitQuizAnswer(quiz.quizId, 'nonexistent-problem', 'A', 5000),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create problem attempt record', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');
      const firstProblem = quiz.problems[0];

      await service.submitQuizAnswer(quiz.quizId, firstProblem.id, 'A', 5000);

      expect(mockPrisma.problemAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            problemId: firstProblem.id,
            xpAwarded: 0,
          }),
        }),
      );
    });
  });

  describe('completeQuiz', () => {
    it('should complete quiz and return results with feedback', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');

      // Answer all problems
      for (const p of quiz.problems) {
        await service.submitQuizAnswer(quiz.quizId, p.id, 'A', 5000);
      }

      const result = await service.completeQuiz(quiz.quizId);

      expect(result.quizId).toBe(quiz.quizId);
      expect(result.totalCount).toBe(quiz.totalProblems);
      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(result.results).toHaveLength(quiz.totalProblems);
      // Results should include feedback now
      for (const r of result.results) {
        expect(r.feedback).toBeDefined();
      }
    });

    it('should mark failed concepts as needs_review', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');

      // Answer all wrong (the MC problem expects 'A', we give 'Z')
      for (const p of quiz.problems) {
        await service.submitQuizAnswer(quiz.quizId, p.id, 'Z', 5000);
      }

      const result = await service.completeQuiz(quiz.quizId);

      // All wrong means score 0, all concepts failed
      expect(result.score).toBe(0);
      expect(result.failedConcepts.length).toBeGreaterThan(0);
      expect(mockPrisma.studentConceptState.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { masteryState: 'needs_review' },
        }),
      );
    });

    it('should award XP based on score', async () => {
      const quiz = await service.generateQuiz('user-1', 'course-1');

      for (const p of quiz.problems) {
        await service.submitQuizAnswer(quiz.quizId, p.id, 'A', 5000);
      }

      const result = await service.completeQuiz(quiz.quizId);

      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(mockXPService.recordXPEvent).toHaveBeenCalled();
    });

    it('should throw for non-existent quiz', async () => {
      await expect(
        service.completeQuiz('fake-quiz'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
