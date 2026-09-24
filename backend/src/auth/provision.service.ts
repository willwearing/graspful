import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PostHogService } from '@/shared/application/posthog.service';

/**
 * Convert a slug like "will-use-case-selling-posthog" to "Will Use Case Selling Posthog".
 * Used as a fallback when the org name would otherwise be the raw slug with spaces.
 */
function humanizeSlug(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Ensures every authenticated user has a private organization workspace.
 * Called by POST /auth/provision after Supabase Auth sign-up
 * (which bypasses /auth/register).
 */
@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(ProvisionService.name);

  constructor(
    private prisma: PrismaService,
    private posthog: PostHogService,
  ) {}

  /**
   * Idempotent: returns the user's owned org if one already exists,
   * otherwise creates an org and owner membership in a single transaction.
   * Public brands and domains are created by course or brand imports.
   */
  async ensureUserOrg(
    userId: string,
    email: string,
  ): Promise<{ orgSlug: string; orgId: string; created: boolean }> {
    // Ensure the user record exists (Supabase trigger may or may not
    // have created it yet).
    await this.prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    });

    // Check for an existing owned org
    const existing = await this.prisma.orgMembership.findFirst({
      where: { userId, role: 'owner' },
      include: { org: { select: { id: true, slug: true } } },
    });

    if (existing) {
      return { orgSlug: existing.org.slug, orgId: existing.org.id, created: false };
    }

    // No owned org — create one
    let orgSlug = this.emailToOrgSlug(email);
    const clash = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (clash) orgSlug = `${orgSlug}-${Date.now().toString(36).slice(-4)}`;

    const orgName = humanizeSlug(orgSlug);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { slug: orgSlug, name: orgName, niche: 'general' },
      });

      await tx.orgMembership.create({
        data: { orgId: org.id, userId, role: 'owner' },
      });

      return { orgSlug: org.slug, orgId: org.id };
    });

    this.logger.log(`Created org ${result.orgSlug} for user ${userId}`);
    this.posthog.recordAccountCreated({ userId, email, ...result, source: 'provision' });

    return { ...result, created: true };
  }

  /**
   * Adds the user as a learner member of an org that runs a public site.
   * Signing up on an active brand site is open by design; orgs without one
   * (e.g. private creator workspaces) cannot be joined this way.
   */
  async ensureLearnerMembership(userId: string, orgSlug: string): Promise<void> {
    const [org, brand] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: { id: true, isActive: true },
      }),
      this.prisma.brand.findFirst({
        where: { orgSlug, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!org?.isActive || !brand) {
      this.logger.warn(`Refusing learner membership for org without an active site: ${orgSlug}`);
      return;
    }

    await this.prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: org.id, userId } },
      update: {},
      create: { orgId: org.id, userId, role: 'member' },
    });

    this.logger.log(`Added user ${userId} as learner member of org ${orgSlug}`);
  }

  private emailToOrgSlug(email: string): string {
    const [local, domainPart] = email.split('@');
    const domain = domainPart.split('.')[0];
    return `${local}-${domain}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
