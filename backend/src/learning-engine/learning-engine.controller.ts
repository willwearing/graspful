import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';

/** @deprecated Use AcademyLearningEngineController instead. Kept as compatibility shim. */
@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class LearningEngineController {
  constructor(
    private engine: LearningEngineService,
    private lessonService: LessonService,
  ) {}

  @Get('next-task')
  async getNextTask(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.engine.getNextTaskForCourse(org.userId, courseId);
  }

  @Get('session')
  async getStudySession(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.engine.getStudySessionForCourse(org.userId, courseId);
  }

  @Post('lessons/:conceptId/start')
  async startLesson(
    @Param('courseId') courseId: string,
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.lessonService.startLesson(
      org.userId,
      org.orgId,
      courseId,
      conceptId,
    );
  }

  @Post('lessons/:conceptId/complete')
  async completeLesson(
    @Param('courseId') courseId: string,
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.lessonService.completeLesson(org.userId, courseId, conceptId);
  }
}
