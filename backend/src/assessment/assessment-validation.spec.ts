import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard } from '@/auth';
import { PostHogService } from '@/shared/application/posthog.service';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';
import { SectionExamService } from './section-exam.service';

describe('Assessment answer API validation', () => {
  let app: INestApplication;
  let url: string;
  const submit = jest.fn().mockResolvedValue({ accepted: true });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AssessmentController],
      providers: [
        { provide: ProblemSubmissionService, useValue: { submitAnswer: submit } },
        { provide: ReviewService, useValue: { submitReviewAnswer: submit } },
        { provide: QuizService, useValue: { submitQuizAnswer: submit } },
        { provide: SectionExamService, useValue: { submitAnswer: submit } },
        { provide: PostHogService, useValue: { capture: jest.fn() } },
      ],
    })
      .overrideGuard(SupabaseAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(CourseScopeGuard).useValue({ canActivate: () => true })
      .overrideGuard(OrgMembershipGuard).useValue({ canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest().orgContext = { orgId: 'org-1', userId: 'user-1' };
        return true;
      } })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => submit.mockClear());

  describe.each([
    'lessons/concept-1/answer',
    'reviews/concept-1/answer',
    'quizzes/quiz-1/answer',
    'sections/section-1/exam/session-1/answer',
  ])('%s', (route) => {
    const post = (body: Record<string, unknown>) => fetch(`${url}/orgs/org-1/courses/course-1/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-1', problemId: 'problem-1', answer: 'A', responseTimeMs: 1, ...body }),
    });

    it.each([
      { answer: null }, { answer: '' }, { responseTimeMs: 0 },
      { responseTimeMs: -1 }, { responseTimeMs: 1.5 }, { responseTimeMs: 2_147_483_648 },
    ])('rejects invalid payload %j before the service executes', async (body) => {
      expect((await post(body)).status).toBe(400);
      expect(submit).not.toHaveBeenCalled();
    });

    it('accepts the shared valid payload', async () => {
      const response = await post({ answer: false });
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ accepted: true });
      expect(submit).toHaveBeenCalledTimes(1);
    });
  });
});
