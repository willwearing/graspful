import { Test, TestingModule } from '@nestjs/testing';
import { BrandsService } from './brands.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';

describe('BrandsService', () => {
  let service: BrandsService;
  let prisma: {
    brand: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    academy: {
      findMany: jest.Mock;
    };
    organization: {
      findUnique: jest.Mock;
    };
  };

  let domains: { addDomain: jest.Mock; getDnsInstructions: jest.Mock };

  afterEach(() => jest.restoreAllMocks());

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    domains = { addDomain: jest.fn().mockResolvedValue({ verified: true }), getDnsInstructions: jest.fn() };
    prisma = {
      brand: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      academy: {
        findMany: jest.fn(),
      },
      organization: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: prisma },
        { provide: VercelDomainsService, useValue: domains },
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
          slug: 'deer-academy',
          name: 'Deer Academy',
          domain: 'deer-academy.graspful.ai',
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
          slug: 'deer-academy',
          name: 'Deer Academy',
          domain: 'deer-academy.graspful.ai',
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
              courseCount: 1,
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

    it('excludes scoped drafts and limits counts to the published courses visible on the brand', async () => {
      prisma.brand.findMany.mockResolvedValue([
        {
          slug: 'field-academy',
          name: 'Field Academy',
          domain: 'field-academy.graspful.ai',
          orgSlug: 'field-org',
          contentScope: { courseIds: ['field-basics', 'draft-track'] },
        },
      ]);
      const publishedCourse = {
        slug: 'field-basics',
        name: 'Field basics',
        description: null,
        sortOrder: 0,
        isPublished: true,
      };
      prisma.academy.findMany.mockResolvedValue([
        {
          slug: 'field-work',
          name: 'Field work',
          description: null,
          org: { slug: 'field-org' },
          courses: [
            publishedCourse,
            { ...publishedCourse, slug: 'draft-track', isPublished: false },
            { ...publishedCourse, slug: 'other-published-track' },
          ],
        },
      ]);

      const result = await service.getPublicAcademyCatalog();

      expect(result).toHaveLength(1);
      expect(result[0].academies).toEqual([
        {
          slug: 'field-work',
          name: 'Field work',
          description: null,
          courseCount: 1,
          publishedCourseCount: 1,
          courses: [publishedCourse],
        },
      ]);
      expect(prisma.academy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            archivedAt: null,
            org: { isActive: true, slug: { in: ['field-org'] } },
          },
          select: expect.objectContaining({
            courses: expect.objectContaining({
              where: { archivedAt: null, isPublished: true },
            }),
          }),
        }),
      );
    });

    it('omits a scoped brand when it has no published courses in scope', async () => {
      prisma.brand.findMany.mockResolvedValue([
        {
          slug: 'field-academy',
          name: 'Field Academy',
          domain: 'field-academy.graspful.ai',
          orgSlug: 'field-org',
          contentScope: { courseIds: ['draft-track'] },
        },
      ]);
      prisma.academy.findMany.mockResolvedValue([
        {
          slug: 'field-work',
          name: 'Field work',
          description: null,
          org: { slug: 'field-org' },
          courses: [
            {
              slug: 'draft-track',
              name: 'Unfinished track',
              description: null,
              sortOrder: 0,
              isPublished: false,
            },
          ],
        },
      ]);

      await expect(service.getPublicAcademyCatalog()).resolves.toEqual([]);
    });

    it('shows default org brand when it is the only brand for an org with published courses', async () => {
      prisma.brand.findMany.mockResolvedValue([
        {
          slug: 'my-org',
          name: 'my org',
          domain: 'my-org.graspful.ai',
          orgSlug: 'my-org',
          contentScope: {},
        },
      ]);
      prisma.academy.findMany.mockResolvedValue([
        {
          slug: 'my-academy',
          name: 'My Academy',
          description: null,
          org: { slug: 'my-org' },
          courses: [
            {
              slug: 'my-course',
              name: 'My Course',
              description: null,
              sortOrder: 0,
              isPublished: true,
            },
          ],
        },
      ]);

      const result = await service.getPublicAcademyCatalog();

      expect(result).toEqual([
        {
          slug: 'my-org',
          name: 'my org',
          domain: 'my-org.graspful.ai',
          orgSlug: 'my-org',
          academies: [
            {
              slug: 'my-academy',
              name: 'My Academy',
              description: null,
              courseCount: 1,
              publishedCourseCount: 1,
              courses: [
                {
                  slug: 'my-course',
                  name: 'My Course',
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

  describe('createWithDomain', () => {
    const dto = {
      slug: 'field', name: 'Field academy', domain: 'field.graspful.com',
      tagline: 'Learn', orgSlug: 'org', theme: {}, landing: {}, seo: {},
    };
    const brand = { id: 'brand-1', domain: 'field.graspful.ai' };
    const dns = { type: 'CNAME', name: 'field', value: 'cname.vercel-dns.com' };

    beforeEach(() => {
      prisma.brand.upsert.mockResolvedValue(brand);
      domains.getDnsInstructions.mockResolvedValue(dns);
    });

    it('upserts before provisioning the persisted canonical domain and returns verification details', async () => {
      const verification = [{ type: 'TXT', domain: '_vercel.field.graspful.ai', value: 'verify', reason: 'ownership' }];
      domains.addDomain.mockResolvedValue({ verified: false, verification });

      await expect(service.createWithDomain(dto)).resolves.toEqual({
        brand, domain: { verified: false, verification, dnsInstructions: dns },
      });

      expect(prisma.brand.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: 'field' },
        create: expect.objectContaining({ orgSlug: 'org', domain: 'field.graspful.ai' }),
      }));
      expect(domains.addDomain).toHaveBeenCalledWith('field.graspful.ai');
      expect(domains.getDnsInstructions).toHaveBeenCalledWith('field.graspful.ai');
      expect(prisma.brand.upsert.mock.invocationCallOrder[0]).toBeLessThan(domains.addDomain.mock.invocationCallOrder[0]);
    });

    it('retains the saved brand and DNS instructions when provisioning fails', async () => {
      domains.addDomain.mockRejectedValue(new Error('Vercel unavailable'));

      await expect(service.createWithDomain(dto)).resolves.toEqual({
        brand, domain: {
          verified: false, error: 'Domain provisioning failed. Configure DNS manually.', dnsInstructions: dns,
        },
      });
    });

    it('returns empty DNS instructions when both provisioning and DNS lookup fail', async () => {
      domains.addDomain.mockRejectedValue(new Error('Vercel unavailable'));
      domains.getDnsInstructions.mockRejectedValue(new Error('DNS unavailable'));

      await expect(service.createWithDomain(dto)).resolves.toEqual({
        brand, domain: {
          verified: false, error: 'Domain provisioning failed. Configure DNS manually.', dnsInstructions: null,
        },
      });
    });

    it('propagates persistence failures before provisioning a domain', async () => {
      prisma.brand.upsert.mockRejectedValue(new Error('Database unavailable'));

      await expect(service.createWithDomain(dto)).rejects.toThrow('Database unavailable');
      expect(domains.addDomain).not.toHaveBeenCalled();
    });
  });

  describe('ensureDefaultForOrg', () => {
    const org = { orgId: 'org-1', email: 'Test.User@example.com' };
    const metadata = { id: 'field-academy', name: 'Field academy', description: 'Identify wildlife' };
    const duplicate = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: 'test', meta: { target: ['slug'] },
    });

    beforeEach(() => {
      prisma.organization.findUnique.mockResolvedValue({ slug: 'org' });
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.create.mockImplementation(async ({ data }) => ({ id: 'brand-1', ...data }));
    });

    it('creates the default website from metadata and provisions its domain', async () => {
      await service.ensureDefaultForOrg(org, metadata);

      expect(prisma.brand.create).toHaveBeenCalledWith({ data: expect.objectContaining({
        slug: 'testuser-field-academy', domain: 'testuser-field-academy.graspful.ai',
        name: 'Field academy', tagline: 'Identify wildlife', orgSlug: 'org',
        landing: expect.objectContaining({ hero: {
          headline: 'Learn Field academy', subheadline: 'Identify wildlife', ctaText: 'Start Learning',
        } }),
      }) });
      expect(domains.addDomain).toHaveBeenCalledWith('testuser-field-academy.graspful.ai');
    });

    it('uses the academy name when the description is absent', async () => {
      await service.ensureDefaultForOrg(org, { id: 'field-academy', name: 'Field academy' });

      expect(prisma.brand.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tagline: 'Field academy' }) });
    });

    it('preserves an existing organization brand', async () => {
      prisma.brand.findFirst.mockResolvedValue({ id: 'custom-brand', domain: 'learn.example.com' });

      await service.ensureDefaultForOrg(org, metadata);

      expect(prisma.brand.create).not.toHaveBeenCalled();
      expect(domains.addDomain).not.toHaveBeenCalled();
    });

    it('does not create a website for a missing organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await service.ensureDefaultForOrg(org, metadata);

      expect(prisma.brand.findFirst).not.toHaveBeenCalled();
      expect(prisma.brand.create).not.toHaveBeenCalled();
    });

    it('retries a unique constraint collision with the next slug without a stale availability check', async () => {
      prisma.brand.create.mockRejectedValueOnce(duplicate());

      await service.ensureDefaultForOrg(org, metadata);

      expect(prisma.brand.create).toHaveBeenCalledTimes(2);
      expect(prisma.brand.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({
        slug: 'testuser-field-academy-1', domain: 'testuser-field-academy-1.graspful.ai',
      }) });
      expect(prisma.brand.findUnique).not.toHaveBeenCalled();
      expect(domains.addDomain).toHaveBeenCalledTimes(1);
      expect(domains.addDomain).toHaveBeenCalledWith('testuser-field-academy-1.graspful.ai');
    });

    it('reuses the same organization brand created by a concurrent request', async () => {
      prisma.brand.create.mockRejectedValueOnce(duplicate());
      prisma.brand.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'concurrent-brand', orgSlug: 'org' });

      await service.ensureDefaultForOrg(org, metadata);

      expect(prisma.brand.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.brand.findFirst).toHaveBeenLastCalledWith({ where: { orgSlug: 'org' } });
      expect(prisma.brand.create).toHaveBeenCalledTimes(1);
      expect(domains.addDomain).not.toHaveBeenCalled();
    });

    it('bounds repeated unique constraint retries and leaves a successful import intact', async () => {
      prisma.brand.create.mockRejectedValue(duplicate());

      await expect(service.ensureDefaultForOrg(org, metadata)).resolves.toBeUndefined();

      expect(prisma.brand.create).toHaveBeenCalledTimes(5);
      expect(prisma.brand.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ slug: 'testuser-field-academy-4' }) });
      expect(domains.addDomain).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('does not retry a non-unique persistence failure or fail the import', async () => {
      prisma.brand.create.mockRejectedValue(new Error('Database unavailable'));

      await expect(service.ensureDefaultForOrg(org, metadata)).resolves.toBeUndefined();

      expect(prisma.brand.create).toHaveBeenCalledTimes(1);
      expect(domains.addDomain).not.toHaveBeenCalled();
    });

    it('keeps organization lookup failures best effort', async () => {
      prisma.organization.findUnique.mockRejectedValue(new Error('Database unavailable'));

      await expect(service.ensureDefaultForOrg(org, metadata)).resolves.toBeUndefined();
      expect(prisma.brand.create).not.toHaveBeenCalled();
    });

    it('does not hold the import open while domain provisioning is pending', async () => {
      domains.addDomain.mockReturnValue(new Promise(() => {}));

      await expect(service.ensureDefaultForOrg(org, metadata)).resolves.toBeUndefined();
      expect(domains.addDomain).toHaveBeenCalledTimes(1);
    });

    it('keeps the created brand when asynchronous domain provisioning fails', async () => {
      domains.addDomain.mockRejectedValue(new Error('Vercel unavailable'));

      await expect(service.ensureDefaultForOrg(org, metadata)).resolves.toBeUndefined();
      expect(prisma.brand.create).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Brand domain provisioning failed'));
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
