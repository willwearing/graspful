import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrgMembershipService {
  constructor(private prisma: PrismaService) {}

  async joinOrganizationBySlug(orgSlug: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, isActive: true },
    });

    if (!org || !org.isActive) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: org.id, userId } },
      update: {},
      create: {
        orgId: org.id,
        userId,
        role: 'member',
      },
    });

    return { orgId: org.id, role: membership.role };
  }
}
