import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { PrismaService } from '@/prisma/prisma.service';
import { BrandsService } from '@/brands/brands.service';
import { CourseImporterService } from '../course-importer.service';
import { AcademyImporterService } from '../academy-importer.service';
import { CourseYamlExportService } from '../course-yaml-export.service';
import { ReviewService } from '../review.service';
import type { ReviewResult } from '../review.service';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import type { ImportCourseDto } from '../dto/import-course.dto';
import type { ImportAcademyDto } from '../dto/import-academy.dto';
import type { ImportResult } from '../course-importer.service';

@Injectable()
export class CourseManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: CourseImporterService,
    private readonly reviewService: ReviewService,
    private readonly courseYamlExport: CourseYamlExportService,
    private readonly brandsService: BrandsService,
    private readonly academyImporter: AcademyImporterService,
  ) {}

  async archiveCourse(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId, archivedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { archivedAt: new Date() },
    });
  }

  async reviewCourseYaml(yaml: string): Promise<ReviewResult> {
    const courseYaml = this.importer.parseCourseYaml(yaml);
    return this.reviewService.review(courseYaml);
  }

  async importCourse(
    org: OrgContext,
    body: ImportCourseDto,
  ): Promise<
    ImportResult & {
      published: boolean;
      url: string | null;
      review?: ReviewResult;
      reviewFailures?: ReviewResult['failures'];
    }
  > {
    let result: ImportResult;
    let review: ReviewResult | undefined;

    if (body.publish) {
      const courseYaml = this.importer.parseCourseYaml(body.yaml);
      review = this.reviewService.review(courseYaml);

      result = await this.importer.importFromYaml(body.yaml, org.orgId, {
        replace: body.replace,
        archiveMissing: body.archiveMissing,
        isPublished: review.passed,
      });
    } else {
      result = await this.importer.importFromYaml(body.yaml, org.orgId, {
        replace: body.replace,
        archiveMissing: body.archiveMissing,
      });
    }

    await this.brandsService.ensureDefaultForOrg(org, this.importer.parseCourseYaml(body.yaml).course);

    const url = await this.buildCourseUrl(org.orgId, result.courseId);
    const reviewFailures = review && !review.passed ? review.failures : undefined;

    return { ...result, url, review, reviewFailures };
  }

  async importAcademy(org: OrgContext, body: ImportAcademyDto) {
    const result = await this.academyImporter.importFromManifest(
      body.manifestYaml,
      body.courseYamls,
      org.orgId,
      { replace: body.replace, archiveMissing: body.archiveMissing },
    );

    const manifest = this.academyImporter.parseManifest(body.manifestYaml);
    await this.brandsService.ensureDefaultForOrg(org, manifest.academy);
    return result;
  }

  async publishCourse(
    orgId: string,
    courseId: string,
  ): Promise<{ courseId: string; published: boolean; url: string | null; review: ReviewResult }> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId, archivedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const courseYamlString = await this.courseYamlExport.exportCourse(orgId, courseId);
    // Review raw exports so legacy invalid answer/schema data produces a
    // failed publication result instead of bypassing withdrawal through a
    // schema exception before the publication flag is updated.
    const courseYaml = yaml.load(courseYamlString);
    const review = this.reviewService.review(courseYaml);

    // A replacement can finish while export/review is running. Publish only
    // the revision that was reviewed, and withdraw legacy content that fails.
    const updated = await this.prisma.course.updateMany({
      where: { id: courseId, orgId, archivedAt: null, updatedAt: course.updatedAt },
      data: { isPublished: review.passed },
    });
    if (updated.count !== 1) {
      throw new ConflictException('The course changed during review. Review and publish the current version again.');
    }

    const url = await this.buildCourseUrl(orgId, courseId);
    return { courseId, published: review.passed, url, review };
  }

  private async buildCourseUrl(orgId: string, courseId: string): Promise<string | null> {
    const orgRecord = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    });
    if (!orgRecord) return null;

    const brand = await this.prisma.brand.findFirst({
      where: { orgSlug: orgRecord.slug, isActive: true },
      select: { domain: true },
    });
    if (!brand) return null;

    return `https://${brand.domain}/browse/${courseId}`;
  }
}
