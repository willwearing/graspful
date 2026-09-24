import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BrandAccessService } from './brand-access.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BrandAccessService', () => {
  let service: BrandAccessService;
  let prisma: {
    organization: { findUnique: jest.Mock };
    orgMembership: { findUnique: jest.Mock };
    brand: { findUnique: jest.Mock };
  };

  const ATTACKER = { userId: 'attacker-user-id' };
  const OWNER = { userId: 'owner-user-id' };

  beforeEach(async () => {
    prisma = {
      organization: { findUnique: jest.fn() },
      orgMembership: { findUnique: jest.fn() },
      brand: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BrandAccessService>(BrandAccessService);
  });

  describe('assertCanManageOrg', () => {
    it('allows an owner', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue({ role: 'owner' });

      await expect(
        service.assertCanManageOrg(OWNER, 'victim-org'),
      ).resolves.toBeUndefined();
    });

    it('allows an admin', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue({ role: 'admin' });

      await expect(
        service.assertCanManageOrg(OWNER, 'victim-org'),
      ).resolves.toBeUndefined();
    });

    it('rejects a plain member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue({ role: 'member' });

      await expect(
        service.assertCanManageOrg(ATTACKER, 'victim-org'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a non-member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.assertCanManageOrg(ATTACKER, 'victim-org'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an API key minted for the same org', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue({ role: 'owner' });

      await expect(
        service.assertCanManageOrg({ ...OWNER, apiKeyOrgId: 'org-1' }, 'my-org'),
      ).resolves.toBeUndefined();
    });

    it('rejects an API key minted for a different org, even for an owner', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-2' });
      prisma.orgMembership.findUnique.mockResolvedValue({ role: 'owner' });

      await expect(
        service.assertCanManageOrg({ ...OWNER, apiKeyOrgId: 'org-1' }, 'other-org'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.orgMembership.findUnique).not.toHaveBeenCalled();
    });

    it('does not disclose whether an unknown org exists', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.assertCanManageOrg(ATTACKER, 'no-such-org'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertCanManageBrand', () => {
    it("rejects a user who is not a member of the brand's org", async () => {
      prisma.brand.findUnique.mockResolvedValue({ orgSlug: 'victim-org' });
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.assertCanManageBrand(ATTACKER, 'victim-brand'),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows an owner of the brand's org and returns the org slug", async () => {
      prisma.brand.findUnique.mockResolvedValue({ orgSlug: 'my-org' });
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      prisma.orgMembership.findUnique.mockResolvedValue({ role: 'owner' });

      await expect(
        service.assertCanManageBrand(OWNER, 'my-brand'),
      ).resolves.toBe('my-org');
    });

    it('throws NotFound for a brand that does not exist', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.assertCanManageBrand(OWNER, 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertSlugAvailableToOrg', () => {
    it('rejects an upsert onto a slug owned by another org', async () => {
      prisma.brand.findUnique.mockResolvedValue({ orgSlug: 'victim-org' });

      await expect(
        service.assertSlugAvailableToOrg('victim-brand', 'attacker-org'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an upsert onto the caller own existing brand', async () => {
      prisma.brand.findUnique.mockResolvedValue({ orgSlug: 'my-org' });

      await expect(
        service.assertSlugAvailableToOrg('my-brand', 'my-org'),
      ).resolves.toBeUndefined();
    });

    it('allows a brand new slug', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.assertSlugAvailableToOrg('fresh-slug', 'my-org'),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertDomainAvailableToOrg', () => {
    it('normalizes and allows a fresh custom domain', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.assertDomainAvailableToOrg(' Learn.Example.com ', 'my-org'),
      ).resolves.toBe('learn.example.com');
    });

    it('allows re-importing a domain the org already holds, even a reserved one', async () => {
      prisma.brand.findUnique.mockResolvedValue({ orgSlug: 'my-org' });

      await expect(
        service.assertDomainAvailableToOrg('myprep.vercel.app', 'my-org'),
      ).resolves.toBe('myprep.vercel.app');
    });

    it('rejects a domain held by another org', async () => {
      prisma.brand.findUnique.mockResolvedValue({ orgSlug: 'victim-org' });

      await expect(
        service.assertDomainAvailableToOrg('victim.graspful.ai', 'attacker-org'),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each(['graspful.ai', 'www.graspful.ai', 'app.graspful.com', 'a.b.graspful.ai', 'graspful.vercel.app'])(
      'rejects the platform host %s for a creator org',
      async (domain) => {
        prisma.brand.findUnique.mockResolvedValue(null);

        await expect(
          service.assertDomainAvailableToOrg(domain, 'attacker-org'),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it('lets the platform org claim a platform host', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.assertDomainAvailableToOrg('www.graspful.ai', 'graspful'),
      ).resolves.toBe('www.graspful.ai');
    });

    it('rejects a value that is not a hostname', async () => {
      await expect(
        service.assertDomainAvailableToOrg('https://evil.test/path', 'my-org'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
