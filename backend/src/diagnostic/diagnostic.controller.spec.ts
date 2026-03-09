import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticSessionService } from './diagnostic-session.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('DiagnosticController', () => {
  let controller: DiagnosticController;
  let mockDiagnostic: any;

  beforeEach(async () => {
    mockDiagnostic = {
      startDiagnostic: jest.fn(),
      submitAnswer: jest.fn(),
      getResult: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiagnosticController],
      providers: [
        { provide: DiagnosticSessionService, useValue: mockDiagnostic },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(DiagnosticController);
  });

  describe('startDiagnostic', () => {
    it('should start a diagnostic for the current user', async () => {
      const startResult = {
        sessionId: 'sess-1',
        questionNumber: 1,
        isComplete: false,
        question: { id: 'p1', questionText: 'Q1' },
      };
      mockDiagnostic.startDiagnostic.mockResolvedValue(startResult);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const result = await controller.startDiagnostic('course-1', orgCtx as any);

      expect(result).toEqual(startResult);
      expect(mockDiagnostic.startDiagnostic).toHaveBeenCalledWith('org-1', 'u1', 'course-1');
    });
  });

  describe('submitAnswer', () => {
    it('should submit an answer and return next question or completion', async () => {
      const answerResult = {
        sessionId: 'sess-1',
        questionNumber: 2,
        isComplete: false,
        wasCorrect: true,
        question: { id: 'p2', questionText: 'Q2' },
      };
      mockDiagnostic.submitAnswer.mockResolvedValue(answerResult);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const body = { sessionId: 'sess-1', answer: 'A', responseTimeMs: 5000 };
      const result = await controller.submitAnswer('course-1', body, orgCtx as any);

      expect(result).toEqual(answerResult);
      expect(mockDiagnostic.submitAnswer).toHaveBeenCalledWith('sess-1', {
        answer: 'A',
        responseTimeMs: 5000,
      });
    });
  });

  describe('getResult', () => {
    it('should return diagnostic result', async () => {
      const diagnosticResult = {
        totalConcepts: 10,
        questionsAnswered: 8,
        breakdown: { mastered: 5, conditionally_mastered: 2, partially_known: 2, unknown: 1 },
      };
      mockDiagnostic.getResult.mockResolvedValue(diagnosticResult);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const result = await controller.getResult('course-1', 'sess-1', orgCtx as any);

      expect(result).toEqual(diagnosticResult);
    });
  });
});
