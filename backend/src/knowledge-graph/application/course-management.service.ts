import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BrandsService } from '@/brands/brands.service';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';
import { CourseImporterService } from '../course-importer.service';
import { CourseYamlExportService } from '../course-yaml-export.service';
import { ReviewService } from '../review.service';
import type { ReviewResult } from '../review.service';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import type { ImportCourseDto } from '../dto/import-course.dto';
import type { ImportResult } from '../course-importer.service';

@Injectable()
export class CourseManagementService {
  private readonly logger = new Logger(CourseManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: CourseImporterService,
    private readonly reviewService: ReviewService,
    private readonly courseYamlExport: CourseYamlExportService,
    private readonly brandsService: BrandsService,
    private readonly vercelDomainsService: VercelDomainsService,
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

    await this.ensureBrandForOrg(org, body.yaml);

    const published = body.publish ? (review?.passed ?? false) : false;
    const url = await this.buildCourseUrl(org.orgId, result.courseId);
    const reviewFailures = review && !review.passed ? review.failures : undefined;

    return { ...result, published, url, review, reviewFailures };
  }

  async publishCourse(
    orgId: string,
    courseId: string,
  ): Promise<{ courseId: string; published: boolean; url: string | null; review: ReviewResult }> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const courseYamlString = await this.courseYamlExport.exportCourse(orgId, courseId);
    const courseYaml = this.importer.parseCourseYaml(courseYamlString);
    const review = this.reviewService.review(courseYaml);

    if (review.passed) {
      await this.prisma.course.update({
        where: { id: courseId },
        data: { isPublished: true },
      });
    }

    const url = await this.buildCourseUrl(orgId, courseId);
    return { courseId, published: review.passed, url, review };
  }

  private async ensureBrandForOrg(org: OrgContext, yamlContent: string) {
    try {
      const orgRecord = await this.prisma.organization.findUnique({
        where: { id: org.orgId },
        select: { slug: true },
      });
      if (!orgRecord) return;

      const existingBrands = await this.prisma.brand.findFirst({
        where: { orgSlug: orgRecord.slug },
      });
      if (existingBrands) return;

      const parsed = this.importer.parseCourseYaml(yamlContent);
      const courseSlug = parsed.course.id;
      const username = org.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const slug = `${username}-${courseSlug}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');
      let attempt = 0;
      let finalSlug = slug;

      while (await this.brandsService.findBySlug(finalSlug)) {
        attempt++;
        finalSlug = `${slug}-${attempt}`;
      }

      const domain = `${finalSlug}.graspful.ai`;

      try {
        const courseName = parsed.course.name;
        const courseDesc = parsed.course.description ?? courseName;
        await this.brandsService.create({
          slug: finalSlug,
          name: courseName,
          domain,
          tagline: courseDesc,
          logoUrl: '/icon.svg',
          orgSlug: orgRecord.slug,
          theme: {},
          landing: {
            hero: {
              headline: `Learn ${courseName}`,
              subheadline: courseDesc,
              ctaText: 'Start Learning',
            },
            features: {
              heading: 'Why choose us?',
              items: [
                {
                  title: 'Adaptive Learning',
                  description: 'Content adapts to your knowledge level',
                  icon: 'Brain',
                },
                {
                  title: 'Spaced Repetition',
                  description: 'Review at optimal intervals for lasting memory',
                  icon: 'Timer',
                },
                {
                  title: 'Progress Tracking',
                  description: 'See exactly where you stand',
                  icon: 'Workflow',
                },
              ],
            },
            howItWorks: {
              heading: 'How it works',
              items: [
                { title: 'Take a diagnostic', description: 'We assess what you already know' },
                { title: 'Learn adaptively', description: 'Focus on gaps, skip what you know' },
                { title: 'Master the material', description: 'Prove mastery through progressive challenges' },
              ],
            },
            faq: [],
            bottomCta: {
              headline: `Ready to learn ${courseName}?`,
              subheadline: 'Start your adaptive learning journey today.',
            },
          },
          seo: {
            title: `${courseName} — Adaptive Learning`,
            description: courseDesc,
            keywords: [],
          },
          pricing: {},
        });

        this.vercelDomainsService.addDomain(domain).catch((err) => {
          this.logger.warn(`Brand domain provisioning failed for ${domain}: ${err}`);
        });
      } catch (err) {
        this.logger.warn(`Auto brand creation failed for org ${org.orgId}: ${err}`);
      }
    } catch (err) {
      this.logger.warn(`Auto brand lookup failed for org ${org.orgId}: ${err}`);
    }
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
