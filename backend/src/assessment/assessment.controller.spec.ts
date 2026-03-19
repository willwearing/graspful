import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';
import { SectionExamService } from './section-exam.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('AssessmentController', () => {
  let controller: AssessmentController;
  let mockProblemSubmission: any;
  let mockReview: any;
  let mockQuiz: any;
  let mockSectionExam: any;

  const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };

  beforeEach(async () => {
    mockProblemSubmission = {
      submitAnswer: jest.fn().mockResolvedValue({
        correct: true,
        feedback: 'Correct!',
        xpAwarded: 15,
        antiGamingTriggered: false,
        updatedKPState: { passed: false, attempts: 1, consecutiveCorrect: 1 },
        updatedMasteryState: 'in_progress',
      }),
    };

    mockReview = {
      startReview: jest.fn().mockResolvedValue({
        sessionId: 'sess-1',
        totalProblems: 3,
        currentProblem: { id: 'p1' },
        problemNumber: 1,
      }),
      submitReviewAnswer: jest.fn().mockResolvedValue({
        correct: true,
        feedback: 'Correct!',
        hasMore: true,
      }),
      completeReview: jest.fn().mockResolvedValue({
        passed: true,
        score: 1.0,
      }),
    };

    mockQuiz = {
      generateQuiz: jest.fn().mockResolvedValue({
        quizId: 'quiz-1',
        totalProblems: 10,
        problems: [],
      }),
      submitQuizAnswer: jest.fn().mockResolvedValue({
        answeredCount: 1,
        totalProblems: 10,
      }),
      completeQuiz: jest.fn().mockResolvedValue({
        score: 0.8,
        xpAwarded: 24,
      }),
    };

    mockSectionExam = {
      startExam: jest.fn().mockResolvedValue({
        sessionId: 'section-exam-1',
        totalProblems: 10,
        problems: [],
      }),
      submitAnswer: jest.fn().mockResolvedValue({
        answeredCount: 1,
        totalProblems: 10,
      }),
      completeExam: jest.fn().mockResolvedValue({
        passed: true,
        score: 0.8,
      }),
      getExamStatus: jest.fn().mockResolvedValue({
        status: 'exam_ready',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentController],
      providers: [
        { provide: ProblemSubmissionService, useValue: mockProblemSubmission },
        { provide: ReviewService, useValue: mockReview },
        { provide: QuizService, useValue: mockQuiz },
        { provide: SectionExamService, useValue: mockSectionExam },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(AssessmentController);
  });

  describe('submitLessonAnswer', () => {
    it('should submit answer and return result', async () => {
      const body = { problemId: 'p1', answer: 'A', responseTimeMs: 5000 };
      const result = await controller.submitLessonAnswer('c1', body, orgCtx as any);

      expect(result.correct).toBe(true);
      expect(mockProblemSubmission.submitAnswer).toHaveBeenCalledWith({
        userId: 'u1',
        problemId: 'p1',
        answer: 'A',
        responseTimeMs: 5000,
        activityType: 'lesson',
      });
    });
  });

  describe('startReview', () => {
    it('should start a review session', async () => {
      const result = await controller.startReview('c1', orgCtx as any);

      expect(result.sessionId).toBe('sess-1');
      expect(mockReview.startReview).toHaveBeenCalledWith('u1', 'c1');
    });
  });

  describe('submitReviewAnswer', () => {
    it('should submit review answer', async () => {
      const body = { sessionId: 'sess-1', problemId: 'p1', answer: 'A', responseTimeMs: 5000 };
      const result = await controller.submitReviewAnswer('c1', body, orgCtx as any);

      expect(result.correct).toBe(true);
      expect(mockReview.submitReviewAnswer).toHaveBeenCalledWith('sess-1', 'p1', 'A', 5000);
    });
  });

  describe('completeReview', () => {
    it('should complete review', async () => {
      const body = { sessionId: 'sess-1' };
      const result = await controller.completeReview('c1', body, orgCtx as any);

      expect(result.passed).toBe(true);
      expect(mockReview.completeReview).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('generateQuiz', () => {
    it('should generate a quiz', async () => {
      const result = await controller.generateQuiz('course-1', orgCtx as any);

      expect(result.quizId).toBe('quiz-1');
      expect(mockQuiz.generateQuiz).toHaveBeenCalledWith('u1', 'course-1');
    });
  });

  describe('submitQuizAnswer', () => {
    it('should submit quiz answer', async () => {
      const body = { problemId: 'p1', answer: 'A', responseTimeMs: 5000 };
      const result = await controller.submitQuizAnswer('quiz-1', body, orgCtx as any);

      expect(result.answeredCount).toBe(1);
      expect(mockQuiz.submitQuizAnswer).toHaveBeenCalledWith('quiz-1', 'p1', 'A', 5000);
    });
  });

  describe('completeQuiz', () => {
    it('should complete quiz', async () => {
      const result = await controller.completeQuiz('quiz-1', orgCtx as any);

      expect(result.score).toBe(0.8);
      expect(mockQuiz.completeQuiz).toHaveBeenCalledWith('quiz-1');
    });
  });

  describe('section exams', () => {
    it('should start a section exam', async () => {
      const result = await controller.startSectionExam(
        'course-1',
        'section-1',
        orgCtx as any,
      );

      expect(result.sessionId).toBe('section-exam-1');
      expect(mockSectionExam.startExam).toHaveBeenCalledWith(
        'u1',
        'course-1',
        'section-1',
      );
    });

    it('should submit a section exam answer', async () => {
      const result = await controller.submitSectionExamAnswer(
        'section-exam-1',
        {
          problemId: 'p1',
          answer: 'A',
          responseTimeMs: 5000,
        },
        orgCtx as any,
      );

      expect(result.answeredCount).toBe(1);
      expect(mockSectionExam.submitAnswer).toHaveBeenCalledWith(
        'u1',
        'section-exam-1',
        'p1',
        'A',
        5000,
      );
    });

    it('should complete a section exam', async () => {
      const result = await controller.completeSectionExam(
        'course-1',
        'section-1',
        'section-exam-1',
        orgCtx as any,
      );

      expect(result.passed).toBe(true);
      expect(mockSectionExam.completeExam).toHaveBeenCalledWith(
        'u1',
        'course-1',
        'section-1',
        'section-exam-1',
      );
    });

    it('should return section exam status', async () => {
      const result = await controller.getSectionExamStatus(
        'course-1',
        'section-1',
        orgCtx as any,
      );

      expect(result.status).toBe('exam_ready');
      expect(mockSectionExam.getExamStatus).toHaveBeenCalledWith(
        'u1',
        'course-1',
        'section-1',
      );
    });
  });
});
