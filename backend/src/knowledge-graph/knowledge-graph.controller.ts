import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrgMembershipGuard, CurrentOrg, MinRole, JwtOrApiKeyGuard } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { PostHogService } from '@/shared/application/posthog.service';
import { CourseReadService } from './course-read.service';
import { CourseYamlExportService } from './course-yaml-export.service';
import type { ValidationResult } from './graph-validation.service';
import { ImportCourseDto, ReviewCourseDto } from './dto/import-course.dto';
import { CourseManagementService } from './application/course-management.service';

@Controller('orgs/:orgId/courses')
@UseGuards(JwtOrApiKeyGuard, OrgMembershipGuard)
export class KnowledgeGraphController {
  constructor(
    private readonly courseReads: CourseReadService,
    private readonly courseYamlExport: CourseYamlExportService,
    private readonly courseManagement: CourseManagementService,
    private readonly posthog: PostHogService,
  ) {}

  @Get()
  async listCourses(@CurrentOrg() org: OrgContext) {
    return this.courseReads.listCourses(org.orgId);
  }

  @Get(':courseId/graph')
  async getCourseGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getCourseGraph(org.orgId, courseId);
  }

  @Get(':courseId/concepts')
  async listConcepts(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.listConcepts(org.orgId, courseId);
  }

  @Get(':courseId/concepts/:conceptId')
  async getConceptDetail(
    @Param('courseId') courseId: string,
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getConceptDetail(org.orgId, courseId, conceptId);
  }

  @Delete(':courseId')
  @MinRole('admin')
  async archiveCourse(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
    @Req() req: Request,
  ) {
    const result = await this.courseManagement.archiveCourse(org.orgId, courseId);
    const ctx = this.posthog.extractContext(req, org.userId);
    this.posthog.capture(ctx, 'course archived', {
      course_id: courseId,
      org_id: org.orgId,
      source: 'api',
    });
    return result;
  }

  @Get(':courseId/yaml')
  async exportCourseYaml(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ): Promise<{ yaml: string }> {
    const yamlString = await this.courseYamlExport.exportCourse(org.orgId, courseId);
    return { yaml: yamlString };
  }

  @Post('import')
  @MinRole('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async importCourse(@Body() body: ImportCourseDto, @CurrentOrg() org: OrgContext, @Req() req: Request) {
    const result = await this.courseManagement.importCourse(org, body);
    const ctx = this.posthog.extractContext(req, org.userId);
    this.posthog.capture(ctx, 'course imported', {
      course_id: result.courseId,
      org_id: org.orgId,
      published: result.published,
      concept_count: result.conceptCount,
      source: 'api',
    });
    return result;
  }

  @Post('review')
  @MinRole('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reviewCourse(@Body() body: ReviewCourseDto, @CurrentOrg() org: OrgContext, @Req() req: Request) {
    const result = await this.courseManagement.reviewCourseYaml(body.yaml);
    const ctx = this.posthog.extractContext(req, org.userId);
    this.posthog.capture(ctx, 'course reviewed', {
      score: result.score,
      passed: result.passed,
      org_id: org.orgId,
      source: 'api',
    });
    return result;
  }

  @Post(':courseId/publish')
  @MinRole('admin')
  async publishCourse(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
    @Req() req: Request,
  ) {
    const result = await this.courseManagement.publishCourse(org.orgId, courseId);
    const ctx = this.posthog.extractContext(req, org.userId);
    this.posthog.capture(ctx, 'course published', {
      course_id: courseId,
      org_id: org.orgId,
      published: result.published,
      source: 'api',
    });
    return result;
  }

  @Post(':courseId/validate')
  @MinRole('admin')
  async validateCourseGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ): Promise<ValidationResult> {
    return this.courseReads.validateCourseGraph(org.orgId, courseId);
  }

  @Get(':courseId/graph/frontier')
  async getKnowledgeFrontier(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getKnowledgeFrontier(org.orgId, courseId, org.userId);
  }
}
