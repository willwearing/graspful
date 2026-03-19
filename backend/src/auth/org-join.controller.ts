import {
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, CurrentUser } from '@/auth';
import type { AuthUser } from '@/auth/guards/supabase-auth.guard';
import { OrgMembershipService } from './org-membership.service';

/**
 * Allows authenticated users to join an organization.
 * Only SupabaseAuthGuard is used — no OrgMembershipGuard (the user isn't a member yet).
 * Idempotent: if already a member, returns existing membership.
 */
@Controller('orgs/:orgSlug/join')
@UseGuards(SupabaseAuthGuard)
export class OrgJoinController {
  constructor(private memberships: OrgMembershipService) {}

  @Post()
  async joinOrg(
    @Param('orgSlug') orgSlug: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.memberships.joinOrganizationBySlug(orgSlug, user.userId);
  }
}
