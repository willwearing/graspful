import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';

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
    return this.engine.getNextTask(org.userId, courseId);
  }

  @Get('session')
  async getStudySession(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    // Default daily XP target of 40; could be overridden by query param later
    const dailyXPTarget = 40;
    return this.engine.getStudySession(org.userId, courseId, dailyXPTarget);
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
