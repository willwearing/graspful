import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticSessionService } from './diagnostic-session.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { PrismaService } from '@/prisma/prisma.service';
import { GraphQueryService } from '@/knowledge-graph/graph-query.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DiagnosticSessionService', () => {
  let service: DiagnosticSessionService;
  let mockPrisma: any;
  let mockStudentState: any;

  const orgId = 'org-1';
  const userId = 'user-1';
  const courseId = 'course-1';

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
        findFirst: jest.fn(),
      },
      problemAttempt: {
        create: jest.fn(),
      },
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

      const problem = {
        id: 'p1',
        knowledgePointId: 'kp1',
        type: 'multiple_choice',
        questionText: 'What is X?',
        options: ['A', 'B', 'C'],
        knowledgePoint: { conceptId: 'c1' },
      };
      mockPrisma.problem.findMany.mockResolvedValue([problem]);

      const result = await service.startDiagnostic(orgId, userId, courseId);

      expect(result.sessionId).toBeDefined();
      expect(result.question).toBeDefined();
      expect(result.questionNumber).toBe(1);
      expect(result.isComplete).toBe(false);
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
      // First start a session
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'e1',
        diagnosticCompleted: false,
      });

      const concepts = [
        { id: 'c1', slug: 'a', difficultyTheta: 0, courseId },
      ];
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getMasteryMap.mockResolvedValue(new Map([['c1', 0.5]]));

      const problem = {
        id: 'p1',
        knowledgePointId: 'kp1',
        type: 'multiple_choice',
        questionText: 'What is X?',
        options: ['A', 'B', 'C'],
        correctAnswer: 'A',
        knowledgePoint: { conceptId: 'c1' },
      };
      mockPrisma.problem.findMany.mockResolvedValue([problem]);
      mockPrisma.problemAttempt.create.mockResolvedValue({ id: 'attempt-1' });
      mockStudentState.bulkUpdateMasteries.mockResolvedValue([]);
      mockStudentState.updateConceptDiagnosticState.mockResolvedValue({});
      mockStudentState.updateSpeedParameters.mockResolvedValue([]);
      mockStudentState.markDiagnosticComplete.mockResolvedValue({});

      const session = await service.startDiagnostic(orgId, userId, courseId);

      const result = await service.submitAnswer(session.sessionId, {
        answer: 'A',
        responseTimeMs: 5000,
      });

      // With only 1 concept and 1 question, should complete after answering
      expect(result.isComplete).toBe(true);
      expect(mockPrisma.problemAttempt.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid session', async () => {
      await expect(
        service.submitAnswer('non-existent', {
          answer: 'A',
          responseTimeMs: 5000,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResult', () => {
    it('should throw NotFoundException for invalid session', async () => {
      await expect(
        service.getResult('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
