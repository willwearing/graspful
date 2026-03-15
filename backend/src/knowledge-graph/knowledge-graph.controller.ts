import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, MinRole } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { CourseImporterService, ImportResult } from './course-importer.service';
import { GraphValidationService, ValidationResult } from './graph-validation.service';
import { GraphQueryService } from './graph-query.service';

@Controller('orgs/:orgId/courses')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class KnowledgeGraphController {
  constructor(
    private prisma: PrismaService,
    private importer: CourseImporterService,
    private graphValidation: GraphValidationService,
    private graphQuery: GraphQueryService,
  ) {}

  @Get()
  async listCourses(@CurrentOrg() org: OrgContext) {
    return this.prisma.course.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':courseId/graph')
  async getCourseGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId: org.orgId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const [sections, concepts, prerequisiteEdges, encompassingEdges] = await Promise.all([
      this.prisma.courseSection.findMany({
        where: { courseId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.concept.findMany({
        where: { courseId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: { courseId },
        },
      }),
      this.prisma.encompassingEdge.findMany({
        where: {
          sourceConcept: { courseId },
        },
      }),
    ]);

    return { course, sections, concepts, prerequisiteEdges, encompassingEdges };
  }

  @Get(':courseId/concepts')
  async listConcepts(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId: org.orgId },
    });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.concept.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Get(':courseId/concepts/:conceptId')
  async getConceptDetail(
    @Param('courseId') courseId: string,
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const concept = await this.prisma.concept.findFirst({
      where: { id: conceptId, courseId, orgId: org.orgId },
      include: {
        knowledgePoints: {
          orderBy: { sortOrder: 'asc' },
          include: {
            problems: true,
          },
        },
        prerequisiteOf: { include: { targetConcept: true } },
        prerequisiteFor: { include: { sourceConcept: true } },
        encompassedBy: { include: { targetConcept: true } },
        encompasses: { include: { sourceConcept: true } },
      },
    });
    if (!concept) throw new NotFoundException('Concept not found');
    return concept;
  }

  @Post('import')
  @MinRole('admin')
  async importCourse(
    @Body() body: { yaml: string },
    @CurrentOrg() org: OrgContext,
  ): Promise<ImportResult> {
    return this.importer.importFromYaml(body.yaml, org.orgId);
  }

  @Post(':courseId/validate')
  @MinRole('admin')
  async validateCourseGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ): Promise<ValidationResult> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId: org.orgId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const [concepts, prereqEdges, encompEdges] = await Promise.all([
      this.prisma.concept.findMany({ where: { courseId } }),
      this.prisma.prerequisiteEdge.findMany({
        where: { sourceConcept: { courseId } },
      }),
      this.prisma.encompassingEdge.findMany({
        where: { sourceConcept: { courseId } },
      }),
    ]);

    const conceptIds = concepts.map((c) => c.id);
    const simplePrereqs = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));
    const weightedEncomp = encompEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
      weight: e.weight,
    }));

    return this.graphValidation.validate(conceptIds, simplePrereqs, weightedEncomp);
  }

  @Get(':courseId/graph/frontier/:userId')
  async getKnowledgeFrontier(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId: org.orgId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const [concepts, prereqEdges] = await Promise.all([
      this.prisma.concept.findMany({ where: { courseId } }),
      this.prisma.prerequisiteEdge.findMany({
        where: { sourceConcept: { courseId } },
      }),
    ]);

    // TODO: In Phase 3, mastery data will come from the student model.
    // For now, return frontier with empty mastery set (all root concepts).
    const masteredIds = new Set<string>();

    const conceptIds = concepts.map((c) => c.id);
    const edges = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    const frontier = this.graphQuery.knowledgeFrontier(conceptIds, edges, masteredIds);

    return {
      courseId,
      userId,
      frontier,
      totalConcepts: concepts.length,
      masteredCount: masteredIds.size,
    };
  }
}
