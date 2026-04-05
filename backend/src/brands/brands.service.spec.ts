import { Test, TestingModule } from '@nestjs/testing';
import { BrandsService } from './brands.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BrandsService', () => {
  let service: BrandsService;
  let prisma: {
    brand: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    academy: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      brand: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      academy: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  describe('findByDomain', () => {
    it('should return brand by domain', async () => {
      const mockBrand = {
        id: 'uuid',
        slug: 'firefighter',
        name: 'FirefighterPrep',
        domain: 'firefighterprep.vercel.app',
        isActive: true,
      };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const result = await service.findByDomain('firefighterprep.vercel.app');

      expect(result).toEqual(mockBrand);
      expect(prisma.brand.findFirst).toHaveBeenCalledWith({
        where: { domain: 'firefighterprep.vercel.app', isActive: true },
      });
    });

    it('should return null for unknown domain', async () => {
      prisma.brand.findFirst.mockResolvedValue(null);

      const result = await service.findByDomain('unknown.com');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return brand by slug', async () => {
      const mockBrand = {
        id: 'uuid',
        slug: 'firefighter',
        name: 'FirefighterPrep',
      };
      prisma.brand.findUnique.mockResolvedValue(mockBrand);

      const result = await service.findBySlug('firefighter');

      expect(result).toEqual(mockBrand);
      expect(prisma.brand.findUnique).toHaveBeenCalledWith({
        where: { slug: 'firefighter' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all active brands ordered by name', async () => {
      const mockBrands = [
        { id: '1', name: 'Alpha', isActive: true },
        { id: '2', name: 'Beta', isActive: true },
      ];
      prisma.brand.findMany.mockResolvedValue(mockBrands);

      const result = await service.findAll();

      expect(result).toEqual(mockBrands);
      expect(prisma.brand.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getPublicAcademyCatalog', () => {
    it('prefers explicitly scoped brands and excludes default org brands', async () => {
      prisma.brand.findMany.mockResolvedValue([
        {
          slug: 'deer-id-academy',
          name: 'Deer ID Academy',
          domain: 'deer-id-academy.graspful.ai',
          orgSlug: 'graspful-gmail',
          contentScope: { courseIds: ['mule-deer-vs-whitetail'] },
        },
        {
          slug: 'graspful-gmail',
          name: 'graspful gmail',
          domain: 'graspful-gmail.graspful.ai',
          orgSlug: 'graspful-gmail',
          contentScope: {},
        },
      ]);
      prisma.academy.findMany.mockResolvedValue([
        {
          slug: 'mule-deer-vs-whitetail',
          name: 'Mule Deer vs White-Tailed Deer',
          description: 'Field identification',
          org: { slug: 'graspful-gmail' },
          courses: [
            {
              slug: 'mule-deer-vs-whitetail',
              name: 'Mule Deer vs White-Tailed Deer',
              description: 'Field identification',
              sortOrder: 0,
              isPublished: true,
            },
          ],
        },
      ]);

      const result = await service.getPublicAcademyCatalog();

      expect(result).toEqual([
        {
          slug: 'deer-id-academy',
          name: 'Deer ID Academy',
          domain: 'deer-id-academy.graspful.ai',
          orgSlug: 'graspful-gmail',
          academies: [
            {
              slug: 'mule-deer-vs-whitetail',
              name: 'Mule Deer vs White-Tailed Deer',
              description: 'Field identification',
              courseCount: 1,
              publishedCourseCount: 1,
              courses: [
                {
                  slug: 'mule-deer-vs-whitetail',
                  name: 'Mule Deer vs White-Tailed Deer',
                  description: 'Field identification',
                  sortOrder: 0,
                  isPublished: true,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('filters out likely test brands and only exposes published fallback courses', async () => {
      prisma.brand.findMany.mockResolvedValue([
        {
          slug: 'js-fundamentals',
          name: 'JS Fundamentals',
          domain: 'js-fundamentals.graspful.ai',
          orgSlug: 'test-example',
          contentScope: {},
        },
        {
          slug: 'firefighter-prep',
          name: 'FirefighterPrep',
          domain: 'firefighterprep.graspful.ai',
          orgSlug: 'firefighter-prep',
          contentScope: {},
        },
      ]);
      prisma.academy.findMany.mockResolvedValue([
        {
          slug: 'nfpa-1001',
          name: 'NFPA 1001',
          description: null,
          org: { slug: 'firefighter-prep' },
          courses: [
            {
              slug: 'nfpa-1001',
              name: 'NFPA 1001',
              description: null,
              sortOrder: 0,
              isPublished: true,
            },
            {
              slug: 'ab-nfpa-1001-ff1',
              name: 'AB NFPA 1001 FF1',
              description: null,
              sortOrder: 1,
              isPublished: false,
            },
          ],
        },
      ]);

      const result = await service.getPublicAcademyCatalog();

      expect(result).toEqual([
        {
          slug: 'firefighter-prep',
          name: 'FirefighterPrep',
          domain: 'firefighterprep.graspful.ai',
          orgSlug: 'firefighter-prep',
          academies: [
            {
              slug: 'nfpa-1001',
              name: 'NFPA 1001',
              description: null,
              courseCount: 2,
              publishedCourseCount: 1,
              courses: [
                {
                  slug: 'nfpa-1001',
                  name: 'NFPA 1001',
                  description: null,
                  sortOrder: 0,
                  isPublished: true,
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('domain normalization', () => {
    it('rewrites .graspful.com to .graspful.ai on create', async () => {
      prisma.brand.create.mockResolvedValue({});

      await service.create({
        slug: 'my-brand',
        name: 'My Brand',
        domain: 'my-brand.graspful.com',
        tagline: 'Learn',
        orgSlug: 'my-org',
        theme: {},
        landing: {},
        seo: {},
      } as any);

      expect(prisma.brand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            domain: 'my-brand.graspful.ai',
          }),
        }),
      );
    });

    it('leaves custom domains untouched', async () => {
      prisma.brand.create.mockResolvedValue({});

      await service.create({
        slug: 'my-brand',
        name: 'My Brand',
        domain: 'learn.mycustomdomain.com',
        tagline: 'Learn',
        orgSlug: 'my-org',
        theme: {},
        landing: {},
        seo: {},
      } as any);

      expect(prisma.brand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            domain: 'learn.mycustomdomain.com',
          }),
        }),
      );
    });
  });
});
