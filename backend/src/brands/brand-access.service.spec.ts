import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BrandAccessService } from './brand-access.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BrandAccessService', () => {
  let service: BrandAccessService;
  let prisma: {
    organization: { findUnique: jest.Mock };
    orgMembership: { findUnique: jest.Mock };
    brand: { findUnique: jest.Mock };
  };

  const ATTACKER = 'attacker-user-id';
  const OWNER = 'owner-user-id';

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
});
