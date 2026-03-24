import { NotFoundException } from '@nestjs/common';
import { OrgMembershipService } from './org-membership.service';

describe('OrgMembershipService', () => {
  let service: OrgMembershipService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: jest.fn(),
      },
      orgMembership: {
        upsert: jest.fn(),
      },
    };

    service = new OrgMembershipService(mockPrisma);
  });

  it('joins an active organization by slug', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      isActive: true,
    });
    mockPrisma.orgMembership.upsert.mockResolvedValue({
      role: 'member',
    });

    await expect(
      service.joinOrganizationBySlug('firefighter-prep', 'user-1'),
    ).resolves.toEqual({
      orgId: 'org-1',
      role: 'member',
    });

    expect(mockPrisma.orgMembership.upsert).toHaveBeenCalledWith({
      where: { orgId_userId: { orgId: 'org-1', userId: 'user-1' } },
      update: {},
      create: {
        orgId: 'org-1',
        userId: 'user-1',
        role: 'member',
      },
    });
  });

  it('throws when the organization does not exist', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.joinOrganizationBySlug('missing-org', 'user-1'),
    ).rejects.toThrow(NotFoundException);
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
      service.joinOrganizationBySlug('graspful', 'user-1'),
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
      service.joinOrganizationBySlug('firefighter-prep', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
