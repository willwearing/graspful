import { ReviewService } from './review.service';
import { NotFoundException } from '@nestjs/common';

describe('ReviewService', () => {
  let service: ReviewService;
  let mockPrisma: any;
  let mockProblemSubmission: any;
  let mockFireUpdate: any;
  let mockSectionExamService: any;

  const mockProblems = [
    { id: 'p1', questionText: 'Q1', type: 'multiple_choice', options: ['A', 'B'], difficulty: 2, isReviewVariant: true },
    { id: 'p2', questionText: 'Q2', type: 'true_false', options: null, difficulty: 3, isReviewVariant: true },
    { id: 'p3', questionText: 'Q3', type: 'fill_blank', options: null, difficulty: 4, isReviewVariant: true },
  ];

  beforeEach(() => {
    mockPrisma = {
      studentConceptState: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'user-1',
          conceptId: 'concept-1',
          masteryState: 'mastered',
          concept: {
            isArchived: false,
            section: null,
          },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      problem: {
        findMany: jest.fn().mockResolvedValue(mockProblems),
      },
      concept: {
        findUnique: jest.fn().mockResolvedValue({
          courseId: 'course-1',
          course: { academyId: 'academy-1' },
        }),
      },
    };

    mockProblemSubmission = {
      submitAnswer: jest.fn().mockResolvedValue({
        correct: true,
        feedback: 'Correct!',
        xpAwarded: 4,
        antiGamingTriggered: false,
      }),
    };

    mockFireUpdate = {
      updateAfterReview: jest.fn().mockResolvedValue(undefined),
      propagateImplicitRepetition: jest.fn().mockResolvedValue(undefined),
    };

    mockSectionExamService = {
      syncSectionStates: jest.fn().mockResolvedValue(undefined),
    };

    const mockStudentState = {
      getConceptStateWithConcept: jest.fn().mockImplementation((...args: any[]) =>
        mockPrisma.studentConceptState.findUnique({
          where: { userId_conceptId: { userId: args[0], conceptId: args[1] } },
          include: { concept: { include: { section: true } } },
        }),
      ),
      getConceptState: jest.fn().mockImplementation((...args: any[]) =>
        mockPrisma.studentConceptState.findUnique({
          where: { userId_conceptId: { userId: args[0], conceptId: args[1] } },
        }),
      ),
      updateConceptAfterPractice: jest.fn().mockImplementation((...args: any[]) =>
        mockPrisma.studentConceptState.update({
          where: { userId_conceptId: { userId: args[0], conceptId: args[1] } },
          data: args[2],
        }),
      ),
    };

    service = new ReviewService(
      mockPrisma,
      mockProblemSubmission,
      mockFireUpdate,
      mockSectionExamService,
      mockStudentState as any,
    );
  });

  describe('startReview', () => {
    it('should create a review session with problems', async () => {
      const result = await service.startReview('user-1', 'concept-1');

      expect(result.sessionId).toBeDefined();
      expect(result.totalProblems).toBe(3);
      expect(result.currentProblem).toBeDefined();
      expect(result.problemNumber).toBe(1);
      expect(result.currentProblem.options).toEqual([
        { id: '0', text: 'A' },
        { id: '1', text: 'B' },
      ]);
    });

    it('should throw when concept state not found', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue(null);

      await expect(
        service.startReview('user-1', 'concept-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when no problems available', async () => {
      mockPrisma.problem.findMany.mockResolvedValue([]);

      await expect(
        service.startReview('user-1', 'concept-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fall back to non-review problems', async () => {
      // First call (review variants): returns empty
      // Second call (all problems): returns problems
      mockPrisma.problem.findMany
        .mockResolvedValueOnce([]) // review variants
        .mockResolvedValueOnce(mockProblems); // all problems

      const result = await service.startReview('user-1', 'concept-1');
      expect(result.totalProblems).toBe(3);
    });
  });

  describe('submitReviewAnswer', () => {
    it('should submit answer and return result', async () => {
      const startResult = await service.startReview('user-1', 'concept-1');

      const result = await service.submitReviewAnswer(
        startResult.sessionId,
        'p1',
        'A',
        5000,
      );

      expect(result.correct).toBe(true);
      expect(result.feedback).toBe('Correct!');
      expect(result.xpAwarded).toBe(4);
      expect(result.problemNumber).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should throw for non-existent session', async () => {
      await expect(
        service.submitReviewAnswer('fake-session', 'p1', 'A', 5000),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeReview', () => {
    it('should mark review as passed when score >= 60%', async () => {
      const startResult = await service.startReview('user-1', 'concept-1');

      // Answer all 3 correctly
      await service.submitReviewAnswer(startResult.sessionId, 'p1', 'A', 5000);
      await service.submitReviewAnswer(startResult.sessionId, 'p2', 'B', 5000);
      await service.submitReviewAnswer(startResult.sessionId, 'p3', 'C', 5000);

      const result = await service.completeReview(startResult.sessionId);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.correctCount).toBe(3);
      expect(result.updatedMasteryState).toBe('mastered');
      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            masteryState: 'mastered',
            failCount: 0,
          }),
        }),
      );
      // FIRe update should be called with academyId (not courseId)
      expect(mockFireUpdate.updateAfterReview).toHaveBeenCalledWith(
        'user-1',
        'concept-1',
        true,
        1.0,
        'academy-1',
      );
    });

    it('should mark review as failed when score < 60%', async () => {
      mockProblemSubmission.submitAnswer
        .mockResolvedValueOnce({ correct: true, feedback: 'Correct!', xpAwarded: 4, antiGamingTriggered: false })
        .mockResolvedValueOnce({ correct: false, feedback: 'Wrong', xpAwarded: 0, antiGamingTriggered: false })
        .mockResolvedValueOnce({ correct: false, feedback: 'Wrong', xpAwarded: 0, antiGamingTriggered: false });

      const startResult = await service.startReview('user-1', 'concept-1');

      await service.submitReviewAnswer(startResult.sessionId, 'p1', 'A', 5000);
      await service.submitReviewAnswer(startResult.sessionId, 'p2', 'B', 5000);
      await service.submitReviewAnswer(startResult.sessionId, 'p3', 'C', 5000);

      const result = await service.completeReview(startResult.sessionId);

      expect(result.passed).toBe(false);
      expect(result.updatedMasteryState).toBe('needs_review');
      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            masteryState: 'needs_review',
          }),
        }),
      );
    });

    it('should throw for non-existent session', async () => {
      await expect(
        service.completeReview('fake-session'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
