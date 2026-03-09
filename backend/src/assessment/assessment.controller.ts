import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AssessmentController {
  constructor(
    private problemSubmission: ProblemSubmissionService,
    private reviewService: ReviewService,
    private quizService: QuizService,
  ) {}

  // --- Lesson Practice ---

  @Post('lessons/:conceptId/answer')
  async submitLessonAnswer(
    @Param('conceptId') conceptId: string,
    @Body() body: { problemId: string; answer: unknown; responseTimeMs: number },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.problemSubmission.submitAnswer({
      userId: org.userId,
      problemId: body.problemId,
      answer: body.answer,
      responseTimeMs: body.responseTimeMs,
      activityType: 'lesson',
    });
  }

  // --- Reviews ---

  @Post('reviews/:conceptId/start')
  async startReview(
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.reviewService.startReview(org.userId, conceptId);
  }

  @Post('reviews/:conceptId/answer')
  async submitReviewAnswer(
    @Param('conceptId') conceptId: string,
    @Body()
    body: {
      sessionId: string;
      problemId: string;
      answer: unknown;
      responseTimeMs: number;
    },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.reviewService.submitReviewAnswer(
      body.sessionId,
      body.problemId,
      body.answer,
      body.responseTimeMs,
    );
  }

  @Post('reviews/:conceptId/complete')
  async completeReview(
    @Param('conceptId') conceptId: string,
    @Body() body: { sessionId: string },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.reviewService.completeReview(body.sessionId);
  }

  // --- Quizzes ---

  @Post('quizzes/generate')
  async generateQuiz(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.quizService.generateQuiz(org.userId, courseId);
  }

  @Post('quizzes/:quizId/answer')
  async submitQuizAnswer(
    @Param('quizId') quizId: string,
    @Body()
    body: { problemId: string; answer: unknown; responseTimeMs: number },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.quizService.submitQuizAnswer(
      quizId,
      body.problemId,
      body.answer,
      body.responseTimeMs,
    );
  }

  @Post('quizzes/:quizId/complete')
  async completeQuiz(
    @Param('quizId') quizId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.quizService.completeQuiz(quizId);
  }
}
