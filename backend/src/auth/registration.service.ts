import { Injectable, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '@/prisma/prisma.service';
import { PostHogService } from '@/shared/application/posthog.service';
import { ApiKeyService } from './api-key/api-key.service';
import * as crypto from 'crypto';

/**
 * Convert a slug like "will-use-case-selling-posthog" to "Will Use Case Selling Posthog".
 * Used as a fallback when the org name would otherwise be the raw slug with spaces.
 */
function humanizeSlug(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private apiKeyService: ApiKeyService,
    private config: ConfigService,
    private posthog: PostHogService,
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

    let txResult: { userId: string; orgId: string; orgSlug: string; apiKey: string };
    // Keep all database work in the cleanup boundary until the transaction commits.
    try {
      let orgSlug = this.emailToOrgSlug(email);
      const existing = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
      if (existing) orgSlug = `${orgSlug}-${Date.now().toString(36).slice(-4)}`;
      const orgName = humanizeSlug(orgSlug);

      txResult = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: { id: supabaseUserId },
          update: { email },
          create: { id: supabaseUserId, email },
        });
        const org = await tx.organization.create({ data: { slug: orgSlug, name: orgName, niche: 'general' } });
        await tx.orgMembership.create({ data: { orgId: org.id, userId: user.id, role: 'owner' } });

        // Create API key inside the transaction so it can see the uncommitted org
        const rawApiKey = `gsk_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
        const keyPrefix = rawApiKey.slice(0, 12);
        await tx.apiKey.create({
          data: { orgId: org.id, userId: user.id, name: 'default', keyHash, keyPrefix },
        });

        return { userId: user.id, orgId: org.id, orgSlug: org.slug, apiKey: rawApiKey };
      });
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

    // Account creation has committed. Analytics failures must not remove its user.
    try {
      this.posthog.recordAccountCreated({
        userId: txResult.userId,
        email,
        orgId: txResult.orgId,
        orgSlug: txResult.orgSlug,
        source: 'registration',
      });
    } catch (error) {
      this.logger.warn('Account creation analytics failed', error);
    }
    return { userId: txResult.userId, orgSlug: txResult.orgSlug, apiKey: txResult.apiKey };
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
