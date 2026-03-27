import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrgMembershipGuard, CurrentOrg, MinRole, JwtOrApiKeyGuard } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
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
  ) {
    return this.courseManagement.archiveCourse(org.orgId, courseId);
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
  async importCourse(@Body() body: ImportCourseDto, @CurrentOrg() org: OrgContext) {
    return this.courseManagement.importCourse(org, body);
  }

  @Post('review')
  @MinRole('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reviewCourse(@Body() body: ReviewCourseDto) {
    return this.courseManagement.reviewCourseYaml(body.yaml);
  }

  @Post(':courseId/publish')
  @MinRole('admin')
  async publishCourse(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseManagement.publishCourse(org.orgId, courseId);
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
