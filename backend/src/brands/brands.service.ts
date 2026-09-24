import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { normalizeBrandDomain } from './domain-policy';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';

export interface PublicCatalogCourse {
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface PublicCatalogAcademy {
  slug: string;
  name: string;
  description: string | null;
  courseCount: number;
  publishedCourseCount: number;
  courses: PublicCatalogCourse[];
}

export interface PublicCatalogBrand {
  slug: string;
  name: string;
  domain: string;
  orgSlug: string;
  academies: PublicCatalogAcademy[];
}

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vercelDomainsService: VercelDomainsService,
  ) {}

  async findByDomain(domain: string) {
    // Can't use findUnique with isActive because it's not part of the unique constraint
    return this.prisma.brand.findFirst({
      where: { domain, isActive: true },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.brand.findUnique({
      where: { slug },
    });
  }

  async findAll() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getPublicAcademyCatalog(): Promise<PublicCatalogBrand[]> {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        domain: true,
        orgSlug: true,
        contentScope: true,
      },
      orderBy: [{ name: 'asc' }, { slug: 'asc' }],
    });

    const productionBrands = brands.filter((brand) => !this.isProbablyTestBrand(brand));
    const orgSlugs = Array.from(new Set(productionBrands.map((brand) => brand.orgSlug)));

    if (orgSlugs.length === 0) {
      return [];
    }

    const academies = await this.prisma.academy.findMany({
      where: {
        archivedAt: null,
        org: {
          isActive: true,
          slug: {
            in: orgSlugs,
          },
        },
      },
      select: {
        slug: true,
        name: true,
        description: true,
        org: {
          select: {
            slug: true,
          },
        },
        courses: {
          where: {
            archivedAt: null,
            isPublished: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            slug: true,
            name: true,
            description: true,
            sortOrder: true,
            isPublished: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { slug: 'asc' }],
    });

    const academiesByOrg = new Map<string, typeof academies>();
    for (const academy of academies) {
      const orgSlug = academy.org.slug;
      const orgAcademies = academiesByOrg.get(orgSlug);
      if (orgAcademies) {
        orgAcademies.push(academy);
      } else {
        academiesByOrg.set(orgSlug, [academy]);
      }
    }

    const brandsByOrg = new Map<string, typeof productionBrands>();
    for (const brand of productionBrands) {
      const orgBrands = brandsByOrg.get(brand.orgSlug);
      if (orgBrands) {
        orgBrands.push(brand);
      } else {
        brandsByOrg.set(brand.orgSlug, [brand]);
      }
    }

    const catalog: PublicCatalogBrand[] = [];

    for (const [orgSlug, orgBrands] of brandsByOrg.entries()) {
      const orgAcademies = academiesByOrg.get(orgSlug) ?? [];
      if (orgAcademies.length === 0) continue;

      const scopedBrands = orgBrands.filter((brand) => this.getScopedCourseIds(brand.contentScope).length > 0);
      const nonDefaultBrands = orgBrands.filter((brand) => !this.isDefaultOrgBrand(brand));
      const candidateBrands = scopedBrands.length > 0
        ? scopedBrands
        : nonDefaultBrands.length > 0
          ? nonDefaultBrands
          : orgBrands.slice(0, 1);

      for (const brand of candidateBrands) {
        const scopedCourseIds = new Set(this.getScopedCourseIds(brand.contentScope));
        const academiesForBrand = orgAcademies
          .map((academy) => {
            const visibleCourses = academy.courses.filter((course) => {
              if (!course.isPublished) return false;

              if (scopedCourseIds.size > 0) {
                return scopedCourseIds.has(course.slug);
              }

              return true;
            });

            if (visibleCourses.length === 0) return null;

            return {
              slug: academy.slug,
              name: academy.name,
              description: academy.description,
              courseCount: visibleCourses.length,
              publishedCourseCount: visibleCourses.length,
              courses: visibleCourses,
            } satisfies PublicCatalogAcademy;
          })
          .filter((academy): academy is PublicCatalogAcademy => academy !== null);

        if (academiesForBrand.length === 0) continue;

        catalog.push({
          slug: brand.slug,
          name: brand.name,
          domain: brand.domain,
          orgSlug: brand.orgSlug,
          academies: academiesForBrand,
        });
      }
    }

    return catalog.sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        domain: normalizeBrandDomain(dto.domain),
        tagline: dto.tagline,
        logoUrl: dto.logoUrl || '/icon.svg',
        faviconUrl: dto.faviconUrl || '/favicon.ico',
        ogImageUrl: dto.ogImageUrl,
        orgSlug: dto.orgSlug,
        theme: dto.theme as Prisma.InputJsonValue,
        landing: dto.landing as Prisma.InputJsonValue,
        seo: dto.seo as Prisma.InputJsonValue,
        pricing: (dto.pricing || {}) as Prisma.InputJsonValue,
        contentScope: (dto.contentScope || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async upsert(dto: CreateBrandDto) {
    const data = {
      name: dto.name,
      domain: normalizeBrandDomain(dto.domain),
      tagline: dto.tagline,
      logoUrl: dto.logoUrl || '/icon.svg',
      faviconUrl: dto.faviconUrl || '/favicon.ico',
      ogImageUrl: dto.ogImageUrl,
      theme: dto.theme as Prisma.InputJsonValue,
      landing: dto.landing as Prisma.InputJsonValue,
      seo: dto.seo as Prisma.InputJsonValue,
      pricing: (dto.pricing || {}) as Prisma.InputJsonValue,
      contentScope: (dto.contentScope || {}) as Prisma.InputJsonValue,
    };
    return this.prisma.brand.upsert({
      where: { slug: dto.slug },
      update: data,
      create: { ...data, slug: dto.slug, orgSlug: dto.orgSlug },
    });
  }

  async createWithDomain(dto: CreateBrandDto) {
    const brand = await this.upsert(dto);

    // Provision the normalized domain on Vercel (brand.domain has the
    // canonical suffix applied by BrandsService, so always use that).
    const normalizedDomain = brand.domain;
    try {
      const vercelResult = await this.vercelDomainsService.addDomain(
        normalizedDomain,
      );
      const dnsInstructions =
        await this.vercelDomainsService.getDnsInstructions(normalizedDomain);
      return {
        brand,
        domain: {
          verified: vercelResult.verified,
          verification: vercelResult.verification,
          dnsInstructions,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Domain provisioning failed for ${normalizedDomain}: ${error}`,
      );
      let dnsInstructions: { type: string; name: string; value: string } | null = null;
      try {
        dnsInstructions =
          await this.vercelDomainsService.getDnsInstructions(normalizedDomain);
      } catch {
        // DNS lookup also failed, so return empty instructions
      }
      return {
        brand,
        domain: {
          verified: false,
          error: 'Domain provisioning failed. Configure DNS manually.',
          dnsInstructions,
        },
      };
    }
  }

  async ensureDefaultForOrg(
    org: { orgId: string; email: string },
    metadata: { id: string; name: string; description?: string },
  ) {
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

      const username = org.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const slug = `${username}-${metadata.id}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const finalSlug = attempt === 0 ? slug : `${slug}-${attempt}`;
        const domain = `${finalSlug}.graspful.ai`;

        try {
          const name = metadata.name;
          const description = metadata.description ?? name;
          await this.create({
            slug: finalSlug,
            name,
            domain,
            tagline: description,
            logoUrl: '/icon.svg',
            orgSlug: orgRecord.slug,
            theme: {},
            landing: {
              hero: {
                headline: `Learn ${name}`,
                subheadline: description,
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
                headline: `Ready to learn ${name}?`,
                subheadline: 'Start your adaptive learning journey today.',
              },
            },
            seo: {
              title: `${name}: Adaptive Learning`,
              description,
              keywords: [],
            },
            pricing: {},
          });

          this.vercelDomainsService.addDomain(domain).catch((err) => {
            this.logger.warn(`Brand domain provisioning failed for ${domain}: ${err}`);
          });
          return;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // A concurrent import may have created this org's default brand.
            const concurrentBrand = await this.prisma.brand.findFirst({
              where: { orgSlug: orgRecord.slug },
            });
            if (concurrentBrand) return;
            if (attempt < maxAttempts - 1) continue;
          }
          throw error;
        }
      }
    } catch (error) {
      // Website setup must not invalidate an otherwise successful import.
      this.logger.warn(`Auto brand setup failed for org ${org.orgId}: ${error}`);
    }
  }

  async update(slug: string, dto: UpdateBrandDto) {
    const data: Prisma.BrandUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tagline !== undefined) data.tagline = dto.tagline;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.faviconUrl !== undefined) data.faviconUrl = dto.faviconUrl;
    if (dto.ogImageUrl !== undefined) data.ogImageUrl = dto.ogImageUrl;
    if (dto.theme !== undefined) data.theme = dto.theme as Prisma.InputJsonValue;
    if (dto.landing !== undefined) data.landing = dto.landing as Prisma.InputJsonValue;
    if (dto.seo !== undefined) data.seo = dto.seo as Prisma.InputJsonValue;
    if (dto.pricing !== undefined) data.pricing = dto.pricing as Prisma.InputJsonValue;
    if (dto.contentScope !== undefined) data.contentScope = dto.contentScope as Prisma.InputJsonValue;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.brand.update({
      where: { slug },
      data,
    });
  }

  async delete(slug: string) {
    return this.prisma.brand.update({
      where: { slug },
      data: { isActive: false },
    });
  }

  private getScopedCourseIds(contentScope: Prisma.JsonValue | null | undefined): string[] {
    if (!contentScope || typeof contentScope !== 'object' || Array.isArray(contentScope)) {
      return [];
    }

    const courseIds = (contentScope as Record<string, unknown>).courseIds;
    if (!Array.isArray(courseIds)) {
      return [];
    }

    return courseIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  private isDefaultOrgBrand(brand: {
    slug: string;
    orgSlug: string;
    domain: string;
  }): boolean {
    return brand.slug === brand.orgSlug && brand.domain === `${brand.orgSlug}.graspful.ai`;
  }

  private isProbablyTestBrand(brand: {
    slug: string;
    name: string;
    domain: string;
    orgSlug: string;
  }): boolean {
    const haystack = `${brand.slug} ${brand.name} ${brand.domain} ${brand.orgSlug}`.toLowerCase();
    return (
      haystack.includes('test') ||
      haystack.includes('e2e') ||
      haystack.includes('dbg') ||
      haystack.includes('debug') ||
      haystack.includes('cli-auth') ||
      haystack.includes('fullflow')
    );
  }
}
