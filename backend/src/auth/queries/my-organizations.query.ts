import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MyOrganizationsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyOrganizations(userId: string) {
    const memberships = await this.prisma.orgMembership.findMany({
      where: { userId },
      include: {
        org: {
          select: {
            id: true,
            slug: true,
            name: true,
            niche: true,
            isActive: true,
          },
        },
      },
    });

    return memberships.map((membership) => ({
      orgId: membership.org.id,
      slug: membership.org.slug,
      name: membership.org.name,
      niche: membership.org.niche,
      isActive: membership.org.isActive,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));
  }
}
