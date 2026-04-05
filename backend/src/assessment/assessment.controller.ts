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
import { PostHogService } from '@/shared/application/posthog.service';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';
import { SectionExamService } from './section-exam.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SubmitReviewAnswerDto } from './dto/submit-review-answer.dto';
import { CompleteReviewDto } from './dto/complete-review.dto';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AssessmentController {
  constructor(
    private problemSubmission: ProblemSubmissionService,
    private reviewService: ReviewService,
    private quizService: QuizService,
    private sectionExamService: SectionExamService,
    private posthog: PostHogService,
  ) {}

  // --- Lesson Practice ---

  @Post('lessons/:conceptId/answer')
  async submitLessonAnswer(
    @Param('conceptId') conceptId: string,
    @Body() body: SubmitAnswerDto,
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
    @Body() body: SubmitReviewAnswerDto,
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
    @Body() body: CompleteReviewDto,
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
    @Body() body: SubmitAnswerDto,
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
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const result = await this.quizService.completeQuiz(quizId);
    this.posthog.capture({ distinctId: org.userId }, 'quiz completed', {
      quiz_id: quizId,
      course_id: courseId,
      org_id: org.orgId,
    });
    return result;
  }

  @Post('sections/:sectionId/exam/start')
  async startSectionExam(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const result = await this.sectionExamService.startExam(org.userId, courseId, sectionId);
    this.posthog.capture({ distinctId: org.userId }, 'section exam started', {
      course_id: courseId,
      section_id: sectionId,
      org_id: org.orgId,
    });
    return result;
  }

  @Post('sections/:sectionId/exam/:sessionId/answer')
  async submitSectionExamAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: SubmitAnswerDto,
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
    const result = await this.sectionExamService.completeExam(
      org.userId,
      courseId,
      sectionId,
      sessionId,
    );
    this.posthog.capture({ distinctId: org.userId }, 'section exam completed', {
      course_id: courseId,
      section_id: sectionId,
      session_id: sessionId,
      org_id: org.orgId,
    });
    return result;
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
