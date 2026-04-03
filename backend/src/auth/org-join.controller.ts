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
 * Allows authenticated users to join the platform org.
 * Learner organizations must be joined through an explicit entitlement flow
 * (invite, purchase, admin assignment, etc.), not by self-service sign-in.
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
