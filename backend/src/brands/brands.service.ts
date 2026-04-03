import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
      const candidateBrands = scopedBrands.length > 0
        ? scopedBrands
        : orgBrands.filter((brand) => !this.isDefaultOrgBrand(brand));

      for (const brand of candidateBrands) {
        const scopedCourseIds = new Set(this.getScopedCourseIds(brand.contentScope));
        const academiesForBrand = orgAcademies
          .map((academy) => {
            const visibleCourses = academy.courses.filter((course) => {
              if (scopedCourseIds.size > 0) {
                return scopedCourseIds.has(course.slug);
              }

              return course.isPublished;
            });

            if (visibleCourses.length === 0) return null;

            return {
              slug: academy.slug,
              name: academy.name,
              description: academy.description,
              courseCount: academy.courses.length,
              publishedCourseCount: academy.courses.filter((course) => course.isPublished).length,
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
        domain: dto.domain,
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
      domain: dto.domain,
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
