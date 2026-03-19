import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, MinRole } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { CourseImporterService, ImportResult } from './course-importer.service';
import { CourseReadService } from './course-read.service';
import type { ValidationResult } from './graph-validation.service';

@Controller('orgs/:orgId/courses')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class KnowledgeGraphController {
  constructor(
    private courseReads: CourseReadService,
    private importer: CourseImporterService,
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

  @Post('import')
  @MinRole('admin')
  async importCourse(
    @Body() body: { yaml: string; replace?: boolean },
    @CurrentOrg() org: OrgContext,
  ): Promise<ImportResult> {
    return this.importer.importFromYaml(body.yaml, org.orgId, {
      replace: body.replace,
    });
  }

  @Post(':courseId/validate')
  @MinRole('admin')
  async validateCourseGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ): Promise<ValidationResult> {
    return this.courseReads.validateCourseGraph(org.orgId, courseId);
  }

  @Get(':courseId/graph/frontier/:userId')
  async getKnowledgeFrontier(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getKnowledgeFrontier(org.orgId, courseId, userId);
  }
}
