import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/** Roles allowed to create, modify, or deactivate a brand. */
const MANAGE_ROLES: readonly OrgRole[] = ['owner', 'admin'];

/**
 * Authorization for brand mutations.
 *
 * Brands are org-owned but are addressed by their own slug rather than by
 * `orgs/:orgId/...`, so they cannot use OrgMembershipGuard. These checks are
 * the equivalent boundary: the caller must be an owner or admin of the org
 * that owns the brand.
 */
@Injectable()
export class BrandAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Caller must be an owner/admin of the org identified by `orgSlug`. */
  async assertCanManageOrg(userId: string, orgSlug: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });

    // Deliberately Forbidden rather than NotFound: a caller with no rights to
    // the org should not learn whether it exists.
    if (!org) {
      throw new ForbiddenException('Insufficient permissions for this organization');
    }

    const membership = await this.prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
      select: { role: true },
    });

    if (!membership || !MANAGE_ROLES.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this organization');
    }
  }

  /**
   * Caller must be an owner/admin of the org that owns `slug`.
   * Returns the owning org slug.
   */
  async assertCanManageBrand(userId: string, slug: string): Promise<string> {
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
      select: { orgSlug: true },
    });

    if (!brand) {
      throw new NotFoundException(`Brand not found: ${slug}`);
    }

    await this.assertCanManageOrg(userId, brand.orgSlug);
    return brand.orgSlug;
  }

  /**
   * Blocks cross-org slug hijacking. An upsert may only target an existing
   * brand when that brand already belongs to the org being claimed.
   */
  async assertSlugAvailableToOrg(slug: string, orgSlug: string): Promise<void> {
    const existing = await this.prisma.brand.findUnique({
      where: { slug },
      select: { orgSlug: true },
    });

    if (existing && existing.orgSlug !== orgSlug) {
      throw new ForbiddenException('Brand slug belongs to another organization');
    }
  }
}
