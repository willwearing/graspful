import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticSessionService } from './diagnostic-session.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { PrismaService } from '@/prisma/prisma.service';
import { GraphQueryService } from '@/knowledge-graph/graph-query.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('DiagnosticSessionService', () => {
  let service: DiagnosticSessionService;
  let mockPrisma: any;
  let mockStudentState: any;

  const orgId = 'org-1';
  const userId = 'user-1';
  const courseId = 'course-1';
  const sessionId = 'session-1';

  const makeProblem = (overrides = {}) => ({
    id: 'p1',
    knowledgePointId: 'kp1',
    type: 'multiple_choice',
    questionText: 'What is X?',
    options: ['A', 'B', 'C'],
    correctAnswer: 'A',
    knowledgePoint: { conceptId: 'c1' },
    ...overrides,
  });

  beforeEach(async () => {
    mockPrisma = {
      courseEnrollment: {
        findUnique: jest.fn(),
      },
      concept: {
        findMany: jest.fn(),
      },
      prerequisiteEdge: {
        findMany: jest.fn(),
      },
      problem: {
        findMany: jest.fn(),
      },
      problemAttempt: {
        create: jest.fn(),
      },
      diagnosticSession: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      diagnosticMasterySnapshot: {
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockStudentState = {
      getMasteryMap: jest.fn(),
      updateConceptDiagnosticState: jest.fn(),
      bulkUpdateMasteries: jest.fn(),
      updateSpeedParameters: jest.fn(),
      markDiagnosticComplete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosticSessionService,
        GraphQueryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StudentStateService, useValue: mockStudentState },
      ],
    }).compile();

    service = module.get(DiagnosticSessionService);
  });

  describe('startDiagnostic', () => {
    it('should return the first question for an enrolled student', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'e1',
        diagnosticCompleted: false,
      });
      mockPrisma.diagnosticSession.findFirst.mockResolvedValue(null);

      const concepts = [
        { id: 'c1', slug: 'a', difficultyTheta: 0, courseId },
        { id: 'c2', slug: 'b', difficultyTheta: 0.5, courseId },
      ];
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);

      mockStudentState.getMasteryMap.mockResolvedValue(
        new Map([
          ['c1', 0.5],
          ['c2', 0.5],
        ]),
      );

      const problem = makeProblem();
      mockPrisma.problem.findMany.mockResolvedValue([problem]);

      // $transaction receives an async callback — execute it with a mock tx
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const mockTx = {
          diagnosticSession: {
            create: jest.fn().mockResolvedValue({ id: sessionId }),
          },
          diagnosticMasterySnapshot: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return fn(mockTx);
      });

      const result = await service.startDiagnostic(orgId, userId, courseId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.question).toBeDefined();
      expect(result.questionNumber).toBe(1);
      expect(result.isComplete).toBe(false);
    });

    it('should resume an existing in-progress session', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'e1',
        diagnosticCompleted: false,
      });

      const problem = makeProblem();
      mockPrisma.diagnosticSession.findFirst.mockResolvedValue({
        id: sessionId,
        userId,
        courseId,
        orgId,
        status: 'in_progress',
        questionCount: 3,
        currentProblemId: problem.id,
        currentConceptId: 'c1',
        currentProblem: problem,
        responses: [],
        masterySnapshots: [
          { conceptId: 'c1', pL: 0.7, tested: true },
          { conceptId: 'c2', pL: 0.5, tested: false },
        ],
        updatedAt: new Date(), // recent
      });

      const concepts = [
        { id: 'c1', slug: 'a', difficultyTheta: 0, courseId },
        { id: 'c2', slug: 'b', difficultyTheta: 0.5, courseId },
      ];
      mockPrisma.concept.findMany.mockResolvedValue(concepts);

      const result = await service.startDiagnostic(orgId, userId, courseId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.questionNumber).toBe(4); // resumed from question 4
      expect(result.isComplete).toBe(false);
    });

    it('should abandon stale session and start fresh', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'e1',
        diagnosticCompleted: false,
      });

      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      mockPrisma.diagnosticSession.findFirst.mockResolvedValue({
        id: 'old-session',
        userId,
        courseId,
        orgId,
        status: 'in_progress',
        questionCount: 2,
        currentProblemId: 'p1',
        currentConceptId: 'c1',
        responses: [],
        masterySnapshots: [],
        updatedAt: staleDate,
      });
      mockPrisma.diagnosticSession.update.mockResolvedValue({});

      const concepts = [
        { id: 'c1', slug: 'a', difficultyTheta: 0, courseId },
      ];
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getMasteryMap.mockResolvedValue(new Map([['c1', 0.5]]));

      const problem = makeProblem();
      mockPrisma.problem.findMany.mockResolvedValue([problem]);

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const mockTx = {
          diagnosticSession: {
            create: jest.fn().mockResolvedValue({ id: 'new-session' }),
          },
          diagnosticMasterySnapshot: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(mockTx);
      });

      const result = await service.startDiagnostic(orgId, userId, courseId);

      // Should have abandoned the old session
      expect(mockPrisma.diagnosticSession.update).toHaveBeenCalledWith({
        where: { id: 'old-session' },
        data: { status: 'abandoned' },
      });
      expect(result.sessionId).toBe('new-session');
      expect(result.questionNumber).toBe(1);
    });

    it('should throw NotFoundException if not enrolled', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.startDiagnostic(orgId, userId, courseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if diagnostic already completed', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        diagnosticCompleted: true,
      });

      await expect(
        service.startDiagnostic(orgId, userId, courseId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitAnswer', () => {
    it('should process answer and return next question or completion', async () => {
      const problem = makeProblem();
      mockPrisma.diagnosticSession.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        courseId,
        orgId,
        status: 'in_progress',
        questionCount: 0,
        currentProblemId: problem.id,
        currentConceptId: 'c1',
        currentProblem: problem,
        responses: [],
        masterySnapshots: [
          { conceptId: 'c1', pL: 0.5, tested: false },
        ],
      });

      const concepts = [{ id: 'c1', difficultyTheta: 0 }];
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockPrisma.diagnosticMasterySnapshot.upsert.mockResolvedValue({});
      mockStudentState.updateConceptDiagnosticState.mockResolvedValue({});
      mockStudentState.updateSpeedParameters.mockResolvedValue([]);
      mockStudentState.markDiagnosticComplete.mockResolvedValue({});

      // $transaction receives an array of promises
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.diagnosticSession.update.mockResolvedValue({});
      mockPrisma.problemAttempt.create.mockResolvedValue({ id: 'attempt-1' });

      const result = await service.submitAnswer(sessionId, userId, {
        answer: 'A',
        responseTimeMs: 5000,
      });

      // With only 1 concept, should complete after answering
      expect(result.isComplete).toBe(true);
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrisma.diagnosticSession.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAnswer('non-existent', userId, {
          answer: 'A',
          responseTimeMs: 5000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong user', async () => {
      mockPrisma.diagnosticSession.findUnique.mockResolvedValue({
        id: sessionId,
        userId: 'other-user',
        status: 'in_progress',
        masterySnapshots: [],
      });

      await expect(
        service.submitAnswer(sessionId, userId, {
          answer: 'A',
          responseTimeMs: 5000,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getResult', () => {
    it('should return results for a valid session', async () => {
      mockPrisma.diagnosticSession.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        questionCount: 5,
        masterySnapshots: [
          { conceptId: 'c1', pL: 0.9, tested: true },
          { conceptId: 'c2', pL: 0.3, tested: true },
        ],
      });

      const result = await service.getResult(sessionId, userId);

      expect(result.totalConcepts).toBe(2);
      expect(result.questionsAnswered).toBe(5);
      expect(result.breakdown).toBeDefined();
      expect(result.conceptDetails).toHaveLength(2);
    });

    it('should throw NotFoundException for invalid session', async () => {
      mockPrisma.diagnosticSession.findUnique.mockResolvedValue(null);

      await expect(
        service.getResult('non-existent', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong user', async () => {
      mockPrisma.diagnosticSession.findUnique.mockResolvedValue({
        id: sessionId,
        userId: 'other-user',
        masterySnapshots: [],
      });

      await expect(
        service.getResult(sessionId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
