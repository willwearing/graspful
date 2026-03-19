import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';
import { SectionExamService } from './section-exam.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AssessmentController {
  constructor(
    private problemSubmission: ProblemSubmissionService,
    private reviewService: ReviewService,
    private quizService: QuizService,
    private sectionExamService: SectionExamService,
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

  @Post('sections/:sectionId/exam/start')
  async startSectionExam(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.sectionExamService.startExam(org.userId, courseId, sectionId);
  }

  @Post('sections/:sectionId/exam/:sessionId/answer')
  async submitSectionExamAnswer(
    @Param('sessionId') sessionId: string,
    @Body()
    body: { problemId: string; answer: unknown; responseTimeMs: number },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.sectionExamService.submitAnswer(
      org.userId,
      sessionId,
      body.problemId,
      body.answer,
      body.responseTimeMs,
    );
  }

  @Post('sections/:sectionId/exam/:sessionId/complete')
  async completeSectionExam(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('sessionId') sessionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.sectionExamService.completeExam(
      org.userId,
      courseId,
      sectionId,
      sessionId,
    );
  }

  @Get('sections/:sectionId/exam/status')
  async getSectionExamStatus(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.sectionExamService.getExamStatus(
      org.userId,
      courseId,
      sectionId,
    );
  }
}
