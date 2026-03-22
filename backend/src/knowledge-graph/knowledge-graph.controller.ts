import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, MinRole } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { CourseImporterService, ImportResult } from './course-importer.service';
import { CourseReadService } from './course-read.service';
import { ReviewService, ReviewResult } from './review.service';
import type { ValidationResult } from './graph-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ImportCourseDto, ReviewCourseDto } from './dto/import-course.dto';

@Controller('orgs/:orgId/courses')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class KnowledgeGraphController {
  constructor(
    private courseReads: CourseReadService,
    private importer: CourseImporterService,
    private reviewService: ReviewService,
    private prisma: PrismaService,
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
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async importCourse(
    @Body() body: ImportCourseDto,
    @CurrentOrg() org: OrgContext,
  ): Promise<ImportResult & { review?: ReviewResult }> {
    if (body.publish) {
      // Run review gate before import
      const courseYaml = this.importer.parseCourseYaml(body.yaml);
      const review = this.reviewService.review(courseYaml);

      const result = await this.importer.importFromYaml(body.yaml, org.orgId, {
        replace: body.replace,
        archiveMissing: body.archiveMissing,
        isPublished: review.passed,
      });

      return { ...result, review };
    }

    return this.importer.importFromYaml(body.yaml, org.orgId, {
      replace: body.replace,
      archiveMissing: body.archiveMissing,
    });
  }

  @Post('review')
  @MinRole('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reviewCourse(
    @Body() body: ReviewCourseDto,
  ): Promise<ReviewResult> {
    const courseYaml = this.importer.parseCourseYaml(body.yaml);
    return this.reviewService.review(courseYaml);
  }

  @Post(':courseId/publish')
  @MinRole('admin')
  async publishCourse(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ): Promise<{ published: boolean; review: ReviewResult }> {
    // Fetch the course with its full content for review
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId: org.orgId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Export course content as YAML structure for review
    const courseGraph = await this.courseReads.getCourseGraph(org.orgId, courseId);
    const conceptDetails = await Promise.all(
      courseGraph.concepts.map((c) =>
        this.courseReads.getConceptDetail(org.orgId, courseId, c.id),
      ),
    );

    // Build a CourseYaml-compatible structure for the review service
    const courseYaml = this.buildCourseYamlForReview(
      course,
      courseGraph,
      conceptDetails,
    );

    const review = this.reviewService.review(courseYaml);

    if (review.passed) {
      await this.prisma.course.update({
        where: { id: courseId },
        data: { isPublished: true },
      });
    }

    return { published: review.passed, review };
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

  /**
   * Reconstruct a CourseYaml-compatible object from persisted data for review.
   * This avoids re-parsing YAML when publishing an already-imported course.
   */
  private buildCourseYamlForReview(
    course: { slug: string; name: string; description: string | null; version: string; estimatedHours: number | null },
    courseGraph: {
      sections: Array<{ id: string; slug: string; name: string; description: string | null }>;
      concepts: Array<{ id: string; slug: string; name: string; sectionId: string | null; difficulty: number; estimatedMinutes: number | null; tags: string[]; sourceReference: string | null }>;
      prerequisiteEdges: Array<{ sourceConceptId: string; targetConceptId: string }>;
    },
    conceptDetails: Array<{
      id: string;
      slug: string;
      name: string;
      sectionId: string | null;
      difficulty: number;
      estimatedMinutes: number | null;
      tags: string[];
      sourceReference: string | null;
      knowledgePoints: Array<{
        id: string;
        slug: string;
        instructionText: string | null;
        instructionContent: unknown;
        workedExampleText: string | null;
        workedExampleContent: unknown;
        problems: Array<{
          id: string;
          type: string;
          questionText: string;
          options: unknown;
          correctAnswer: unknown;
          explanation: string | null;
          difficulty: number;
        }>;
      }>;
      prerequisiteFor: Array<{ sourceConcept: { slug: string } }>;
    }>,
  ) {
    // Build concept slug lookup from id
    const conceptIdToSlug = new Map<string, string>();
    for (const c of courseGraph.concepts) {
      conceptIdToSlug.set(c.id, c.slug);
    }

    // Build section slug lookup from id
    const sectionIdToSlug = new Map<string, string>();
    for (const s of courseGraph.sections) {
      sectionIdToSlug.set(s.id, s.slug);
    }

    // Build prerequisite map: target concept id -> source concept slugs
    const prereqMap = new Map<string, string[]>();
    for (const edge of courseGraph.prerequisiteEdges) {
      const sourceSlug = conceptIdToSlug.get(edge.sourceConceptId);
      if (sourceSlug) {
        const existing = prereqMap.get(edge.targetConceptId) ?? [];
        existing.push(sourceSlug);
        prereqMap.set(edge.targetConceptId, existing);
      }
    }

    return {
      course: {
        id: course.slug,
        name: course.name,
        description: course.description ?? undefined,
        version: course.version,
        estimatedHours: course.estimatedHours ?? undefined,
      },
      sections: courseGraph.sections.map((s) => ({
        id: s.slug,
        name: s.name,
        description: s.description ?? undefined,
      })),
      concepts: conceptDetails.map((c) => ({
        id: c.slug,
        name: c.name,
        section: c.sectionId ? sectionIdToSlug.get(c.sectionId) : undefined,
        difficulty: c.difficulty,
        estimatedMinutes: c.estimatedMinutes ?? undefined,
        tags: c.tags,
        sourceRef: c.sourceReference ?? undefined,
        prerequisites: prereqMap.get(c.id) ?? [],
        encompassing: [],
        knowledgePoints: c.knowledgePoints.map((kp) => ({
          id: kp.slug,
          instruction: kp.instructionText ?? undefined,
          instructionContent: kp.instructionContent ?? undefined,
          workedExample: kp.workedExampleText ?? undefined,
          workedExampleContent: kp.workedExampleContent ?? undefined,
          problems: kp.problems.map((p) => ({
            id: p.id,
            type: p.type,
            question: p.questionText,
            options: p.options ?? undefined,
            correct: p.correctAnswer,
            explanation: p.explanation ?? undefined,
            difficulty: p.difficulty,
          })),
        })),
      })),
    } as any;
  }
}
