import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { OrgMembershipGuard } from './guards/org-membership.guard';
import { GlobalAdminGuard } from './guards/global-admin.guard';

@Module({
  providers: [SupabaseAuthGuard, OrgMembershipGuard, GlobalAdminGuard],
  exports: [SupabaseAuthGuard, OrgMembershipGuard, GlobalAdminGuard],
})
export class AuthModule {}
