import {
  Controller,
  Logger,
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
 *
 * TODO: Add invite-based or approval-based enrollment before opening to public.
 * Currently any authenticated user can join any active org by slug.
 * Consider: rate limiting, invite tokens, or org-level allowOpenEnrollment flag.
 */
@Controller('orgs/:orgSlug/join')
@UseGuards(SupabaseAuthGuard)
export class OrgJoinController {
  private readonly logger = new Logger(OrgJoinController.name);

  constructor(private memberships: OrgMembershipService) {}

  @Post()
  async joinOrg(
    @Param('orgSlug') orgSlug: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.logger.log(`User ${user.userId} joining org ${orgSlug}`);
    return this.memberships.joinOrganizationBySlug(orgSlug, user.userId);
  }
}
