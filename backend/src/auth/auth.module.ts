import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { OrgMembershipGuard } from './guards/org-membership.guard';
import { GlobalAdminGuard } from './guards/global-admin.guard';
import { OrgJoinController } from './org-join.controller';
import { OrgMembershipService } from './org-membership.service';

@Module({
  controllers: [OrgJoinController],
  providers: [
    SupabaseAuthGuard,
    OrgMembershipGuard,
    GlobalAdminGuard,
    OrgMembershipService,
  ],
  exports: [
    SupabaseAuthGuard,
    OrgMembershipGuard,
    GlobalAdminGuard,
    OrgMembershipService,
  ],
})
export class AuthModule {}
