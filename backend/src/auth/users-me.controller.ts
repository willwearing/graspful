import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, CurrentUser } from '@/auth';
import type { AuthUser } from '@/auth/guards/supabase-auth.guard';
import { MyOrganizationsQueryService } from './queries/my-organizations.query';

@Controller('users/me')
@UseGuards(SupabaseAuthGuard)
export class UsersMeController {
  constructor(private readonly myOrganizationsQuery: MyOrganizationsQueryService) {}

  @Get('orgs')
  async listMyOrgs(@CurrentUser() user: AuthUser) {
    return this.myOrganizationsQuery.listMyOrganizations(user.userId);
  }
}
