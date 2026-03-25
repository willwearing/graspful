import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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
}
