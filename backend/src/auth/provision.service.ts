import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Ensures every authenticated user has a personal organization, brand,
 * and default API key.  Called by POST /auth/provision after Supabase
 * Auth sign-up (which bypasses /auth/register).
 */
@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(ProvisionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Idempotent: returns the user's owned org if one already exists,
   * otherwise creates org + brand + API key in a single transaction.
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

      // Default brand so the org is accessible via the web UI
      const domain = `${orgSlug}.graspful.ai`;
      await tx.brand.create({
        data: {
          slug: orgSlug,
          name: orgName,
          domain,
          tagline: 'Learn adaptively',
          logoUrl: '/icon.svg',
          orgSlug,
          theme: {},
          landing: {
            hero: { headline: orgName, subheadline: 'Adaptive learning', ctaText: 'Start Learning' },
            features: { heading: 'Features', items: [] },
            howItWorks: { heading: 'How it works', items: [] },
            faq: [],
          },
          seo: { title: orgName, description: `Adaptive learning at ${orgName}`, keywords: [] },
        },
      });

      // Default API key
      const rawApiKey = `gsk_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      const keyPrefix = rawApiKey.slice(0, 12);
      await tx.apiKey.create({
        data: { orgId: org.id, userId, name: 'default', keyHash, keyPrefix },
      });

      return { orgSlug: org.slug, orgId: org.id };
    });

    this.logger.log(`Created org ${result.orgSlug} for user ${userId}`);
    return { ...result, created: true };
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
