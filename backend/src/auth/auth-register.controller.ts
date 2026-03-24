import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PrismaService } from '@/prisma/prisma.service';
import { ApiKeyService } from './api-key/api-key.service';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@Controller('auth')
export class AuthRegisterController {
  private readonly logger = new Logger(AuthRegisterController.name);
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private apiKeyService: ApiKeyService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(
    @Body() body: RegisterDto,
  ): Promise<{ userId: string; orgSlug: string; apiKey: string }> {
    // 1. Create Supabase user (auto-confirmed via admin API)
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      this.logger.error('Supabase user creation failed', authError);
      if (authError?.message?.includes('User already registered')) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new InternalServerErrorException('Registration failed');
    }

    const supabaseUserId = authData.user.id;

    // 2. Check for slug collision and generate unique slug
    let orgSlug = this.emailToOrgSlug(body.email);
    const existing = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (existing) orgSlug = `${orgSlug}-${Date.now().toString(36).slice(-4)}`;

    const orgName = orgSlug.replace(/-/g, ' ');

    // 3. Create all DB records in a transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: supabaseUserId,
            email: body.email,
          },
        });

        const org = await tx.organization.create({
          data: {
            slug: orgSlug,
            name: orgName,
            niche: 'general',
          },
        });

        await tx.orgMembership.create({
          data: {
            orgId: org.id,
            userId: user.id,
            role: 'owner',
          },
        });

        const { key: rawApiKey } = await this.apiKeyService.createKey(
          org.id,
          user.id,
          'default',
        );

        return {
          userId: user.id,
          orgSlug: org.slug,
          apiKey: rawApiKey,
        };
      });

      return result;
    } catch (error) {
      // Clean up Supabase user if DB transaction fails
      await this.supabase.auth.admin.deleteUser(supabaseUserId).catch((err) => {
        this.logger.error('Failed to clean up Supabase user after transaction failure', err);
      });
      throw new InternalServerErrorException('Registration failed');
    }
  }

  private emailToOrgSlug(email: string): string {
    const [local, domainPart] = email.split('@');
    const domain = domainPart.split('.')[0]; // strip TLD
    return `${local}-${domain}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
