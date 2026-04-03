import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrgMembershipService, PLATFORM_ORG_SLUG } from './org-membership.service';

describe('OrgMembershipService', () => {
  let service: OrgMembershipService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      orgMembership: {
        upsert: jest.fn(),
      },
    };

    service = new OrgMembershipService(mockPrisma);
  });

  it('rejects direct self-enrollment for learner organizations', async () => {
    await expect(
      service.joinOrganizationBySlug('firefighter-prep', 'user-1'),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.orgMembership.upsert).not.toHaveBeenCalled();
  });

  it('auto-creates the platform org when it does not exist', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    mockPrisma.organization.create.mockResolvedValue({
      id: 'org-graspful',
      isActive: true,
    });
    mockPrisma.orgMembership.upsert.mockResolvedValue({
      role: 'owner',
    });

    await expect(
      service.joinOrganizationBySlug(PLATFORM_ORG_SLUG, 'user-1'),
    ).resolves.toEqual({
      orgId: 'org-graspful',
      role: 'owner',
    });
  });

  it('assigns owner role when joining the graspful platform org', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-graspful',
      isActive: true,
    });
    mockPrisma.orgMembership.upsert.mockResolvedValue({
      role: 'owner',
    });

    await expect(
      service.joinOrganizationBySlug(PLATFORM_ORG_SLUG, 'user-1'),
    ).resolves.toEqual({
      orgId: 'org-graspful',
      role: 'owner',
    });

    expect(mockPrisma.orgMembership.upsert).toHaveBeenCalledWith({
      where: { orgId_userId: { orgId: 'org-graspful', userId: 'user-1' } },
      update: {},
      create: {
        orgId: 'org-graspful',
        userId: 'user-1',
        role: 'owner',
      },
    });
  });

  it('throws when the organization is archived', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      isActive: false,
    });

    await expect(
      service.joinOrganizationBySlug(PLATFORM_ORG_SLUG, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
