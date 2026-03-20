import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  SupabaseAuthGuard,
  OrgMembershipGuard,
  CurrentOrg,
  MinRole,
} from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { CourseReadService } from './course-read.service';
import { AcademyImporterService } from './academy-importer.service';

@Controller('orgs/:orgId/academies')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AcademyGraphController {
  constructor(
    private courseReads: CourseReadService,
    private academyImporter: AcademyImporterService,
  ) {}

  @Post('import')
  @MinRole('admin')
  async importAcademy(
    @Body()
    body: {
      manifestYaml: string;
      courseYamls: Record<string, string>;
      replace?: boolean;
      archiveMissing?: boolean;
    },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.academyImporter.importFromManifest(
      body.manifestYaml,
      body.courseYamls,
      org.orgId,
      {
        replace: body.replace,
        archiveMissing: body.archiveMissing,
      },
    );
  }

  @Get()
  async listAcademies(@CurrentOrg() org: OrgContext) {
    return this.courseReads.listAcademies(org.orgId);
  }

  @Get(':academyId')
  async getAcademy(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademy(org.orgId, academyId);
  }

  @Get(':academyId/graph')
  async getAcademyGraph(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademyGraph(org.orgId, academyId);
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
    return this.courseReads.listAcademyCourses(org.orgId, academyId);
  }

  @Get(':academyId/graph/frontier/:userId')
  async getAcademyKnowledgeFrontier(
    @Param('academyId') academyId: string,
    @Param('userId') userId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseReads.getAcademyKnowledgeFrontier(
      org.orgId,
      academyId,
      userId,
    );
  }
}
