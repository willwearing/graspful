import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  JwtOrApiKeyGuard,
  OrgMembershipGuard,
  CurrentOrg,
  MinRole,
  AcademyScopeGuard,
} from '@/auth';
import type { OrgContext } from '@/auth/org-context';
import { CourseReadService } from './course-read.service';
import { CourseManagementService } from './application/course-management.service';
import { ImportAcademyDto } from './dto/import-academy.dto';

@Controller('orgs/:orgId/academies')
@UseGuards(JwtOrApiKeyGuard, OrgMembershipGuard, AcademyScopeGuard)
export class AcademyGraphController {
  constructor(
    private courseReads: CourseReadService,
    private courseManagement: CourseManagementService,
  ) {}

  @Post('import')
  @MinRole('admin')
  async importAcademy(
    @Body() body: ImportAcademyDto,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseManagement.importAcademy(org, body);
  }

  @Get()
  async listAcademies(@CurrentOrg() org: OrgContext) {
    return this.courseReads.listAcademies(org.orgId, {
      includeDrafts: org.role === 'owner' || org.role === 'admin',
    });
  }

  @Get('slug/:academySlug')
  async getAcademyBySlug(
    @Param('academySlug') academySlug: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademyBySlug(org.orgId, academySlug, {
      includeDrafts: org.role === 'owner' || org.role === 'admin',
    });
  }

  @Get(':academyId')
  async getAcademy(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademy(org.orgId, academyId, {
      includeDrafts: org.role === 'owner' || org.role === 'admin',
    });
  }

  @Get(':academyId/structure')
  async getAcademyGraph(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademyGraph(org.orgId, academyId, {
      includeDrafts: org.role === 'owner' || org.role === 'admin',
    });
  }

  @Post(':academyId/validate')
  @MinRole('admin')
  async validateAcademyGraph(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.validateAcademyGraph(org.orgId, academyId);
  }

  @Get(':academyId/courses')
  async listAcademyCourses(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.listAcademyCourses(org.orgId, academyId, {
      includeDrafts: org.role === 'owner' || org.role === 'admin',
    });
  }

  @Get(':academyId/graph/frontier')
  async getAcademyKnowledgeFrontier(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademyKnowledgeFrontier(
      org.orgId,
      academyId,
      org.userId,
    );
  }
}
