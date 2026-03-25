import {
  Controller,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, CurrentUser } from '@/auth';
import type { AuthUser } from '@/auth/guards/supabase-auth.guard';
import { ProvisionService } from './provision.service';

/**
 * Called after Supabase Auth sign-up/sign-in to ensure the user has a
 * personal organization and DB user record.  The web UI sign-up flow
 * uses Supabase Auth directly (not /auth/register), so this endpoint
 * fills the gap by creating the org + brand + API key that /auth/register
 * would have created.
 *
 * Idempotent: if the user already has an org, returns it unchanged.
 */
@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthProvisionController {
  private readonly logger = new Logger(AuthProvisionController.name);

  constructor(private provision: ProvisionService) {}

  @Post('provision')
  async provisionUser(@CurrentUser() user: AuthUser) {
    this.logger.log(`Provisioning user ${user.userId}`);
    return this.provision.ensureUserOrg(user.userId, user.email);
  }
}
