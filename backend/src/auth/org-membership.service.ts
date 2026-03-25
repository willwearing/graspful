import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/** The platform org slug — creators signing up here own their account */
export const PLATFORM_ORG_SLUG = 'graspful';

@Injectable()
export class OrgMembershipService {
  private readonly logger = new Logger(OrgMembershipService.name);

  constructor(private prisma: PrismaService) {}

  async joinOrganizationBySlug(orgSlug: string, userId: string) {
    let org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, isActive: true },
    });

    // Auto-create the platform org if it doesn't exist yet.
    // This handles fresh deployments where the seed hasn't run.
    if (!org && orgSlug === PLATFORM_ORG_SLUG) {
      this.logger.warn(`Platform org "${PLATFORM_ORG_SLUG}" missing — creating it`);
      const created = await this.prisma.organization.create({
        data: {
          slug: PLATFORM_ORG_SLUG,
          name: 'Graspful',
          niche: 'general',
          isActive: true,
        },
        select: { id: true, isActive: true },
      });
      org = created;
    }

    if (!org || !org.isActive) {
      throw new NotFoundException('Organization not found');
    }

    // Platform org members get owner role; brand-specific org members get member role
    const role = orgSlug === PLATFORM_ORG_SLUG ? 'owner' : 'member';

    const membership = await this.prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: org.id, userId } },
      update: {},
      create: {
        orgId: org.id,
        userId,
        role,
      },
    });

    return { orgId: org.id, role: membership.role };
  }
}
