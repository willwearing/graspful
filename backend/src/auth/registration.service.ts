import { Injectable, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '@/prisma/prisma.service';
import { VercelDomainsService } from '@/brands/vercel-domains.service';
import { ApiKeyService } from './api-key/api-key.service';
import * as crypto from 'crypto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private apiKeyService: ApiKeyService,
    private config: ConfigService,
    private vercelDomains: VercelDomainsService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async register(email: string, password: string): Promise<{ userId: string; orgSlug: string; apiKey: string }> {
    // 1. Create Supabase user
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      this.logger.error('Supabase user creation failed', {
        message: authError?.message,
        status: authError?.status,
        name: authError?.name,
        code: (authError as any)?.code,
      });
      if (authError?.message?.includes('User already registered')) {
        throw new ConflictException('An account with this email already exists. Run `graspful login` to authenticate.');
      }
      if (authError?.message?.includes('invalid') && authError?.message?.includes('email')) {
        throw new BadRequestException('Invalid email address');
      }
      if (authError?.message?.includes('password') || authError?.message?.includes('weak')) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      if (authError?.status === 429) {
        throw new BadRequestException('Too many registration attempts. Try again later.');
      }
      throw new InternalServerErrorException(
        `Registration failed: ${authError?.message || 'Unknown error'}`,
      );
    }

    const supabaseUserId = authData.user.id;

    // 2. Generate slug
    let orgSlug = this.emailToOrgSlug(email);
    const existing = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (existing) orgSlug = `${orgSlug}-${Date.now().toString(36).slice(-4)}`;
    const orgName = orgSlug.replace(/-/g, ' ');

    // 3. Create DB records
    // Note: Supabase has an AFTER INSERT trigger on auth.users that auto-creates
    // a public.users row. We use upsert to handle the race gracefully.
    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: { id: supabaseUserId },
          update: { email },
          create: { id: supabaseUserId, email },
        });
        const org = await tx.organization.create({ data: { slug: orgSlug, name: orgName, niche: 'general' } });
        await tx.orgMembership.create({ data: { orgId: org.id, userId: user.id, role: 'owner' } });

        // Create a default brand so the org is accessible via the web UI
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

        // Create API key inside the transaction so it can see the uncommitted org
        const rawApiKey = `gsk_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
        const keyPrefix = rawApiKey.slice(0, 12);
        await tx.apiKey.create({
          data: { orgId: org.id, userId: user.id, name: 'default', keyHash, keyPrefix },
        });

        return { userId: user.id, orgSlug: org.slug, apiKey: rawApiKey, domain };
      });

      // Provision the subdomain on Vercel (non-blocking — registration shouldn't fail if Vercel is down)
      try {
        await this.vercelDomains.addDomain(txResult.domain);
      } catch (err) {
        this.logger.warn(`Failed to provision domain ${txResult.domain} on Vercel: ${err}`);
      }

      return { userId: txResult.userId, orgSlug: txResult.orgSlug, apiKey: txResult.apiKey };
    } catch (error) {
      this.logger.error('Prisma transaction failed during registration', {
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      await this.supabase.auth.admin.deleteUser(supabaseUserId).catch((err) => {
        this.logger.error('Failed to clean up Supabase user after transaction failure', err);
      });
      throw new InternalServerErrorException('Registration failed');
    }
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
