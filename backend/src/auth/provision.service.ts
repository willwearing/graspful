import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';

/**
 * Ensures every authenticated user has a personal organization and brand.
 * Called by POST /auth/provision after Supabase Auth sign-up
 * (which bypasses /auth/register).
 */
@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(ProvisionService.name);

  constructor(
    private prisma: PrismaService,
    private vercelDomains: VercelDomainsService,
  ) {}

  /**
   * Idempotent: returns the user's owned org if one already exists,
   * otherwise creates org + brand in a single transaction.
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

    const orgName = orgSlug.replace(/-/g, ' ');

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { slug: orgSlug, name: orgName, niche: 'general' },
      });

      await tx.orgMembership.create({
        data: { orgId: org.id, userId, role: 'owner' },
      });

      // Default brand so the org is accessible via the web UI.
      // Uses upsert for idempotency in case a brand with this slug already exists.
      const domain = `${orgSlug}.graspful.ai`;
      await tx.brand.upsert({
        where: { slug: orgSlug },
        update: {
          name: orgName,
          domain,
          tagline: 'Adaptive learning',
          logoUrl: '/icon.svg',
          orgSlug,
          theme: { preset: 'indigo', radius: '0.5rem' },
          landing: {
            hero: { headline: orgName, subheadline: 'Adaptive learning', ctaText: 'Start Learning' },
            features: { heading: 'Features', items: [] },
            howItWorks: { heading: 'How it works', items: [] },
            faq: [],
          },
          seo: { title: orgName, description: 'Adaptive learning', keywords: [] },
        },
        create: {
          slug: orgSlug,
          name: orgName,
          domain,
          tagline: 'Adaptive learning',
          logoUrl: '/icon.svg',
          orgSlug,
          theme: { preset: 'indigo', radius: '0.5rem' },
          landing: {
            hero: { headline: orgName, subheadline: 'Adaptive learning', ctaText: 'Start Learning' },
            features: { heading: 'Features', items: [] },
            howItWorks: { heading: 'How it works', items: [] },
            faq: [],
          },
          seo: { title: orgName, description: 'Adaptive learning', keywords: [] },
        },
      });

      return { orgSlug: org.slug, orgId: org.id };
    });

    this.logger.log(`Created org ${result.orgSlug} for user ${userId}`);

    // Provision the subdomain on Vercel (non-blocking)
    const domain = `${result.orgSlug}.graspful.ai`;
    this.vercelDomains.addDomain(domain).catch((err) => {
      this.logger.warn(`Failed to provision domain ${domain} on Vercel: ${err}`);
    });

    return { ...result, created: true };
  }

  /**
   * Adds the user as a member of the given org if not already a member.
   * Used to auto-enroll learners when they sign up on a branded academy site.
   */
  async ensureLearnerMembership(userId: string, orgSlug: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (!org) {
      this.logger.warn(`Cannot add learner to non-existent org: ${orgSlug}`);
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
