import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { OrgMembershipGuard } from './guards/org-membership.guard';
import { GlobalAdminGuard } from './guards/global-admin.guard';
import { JwtOrApiKeyGuard } from './guards/jwt-or-apikey.guard';
import { OrgJoinController } from './org-join.controller';
import { AuthRegisterController } from './auth-register.controller';
import { UsersMeController } from './users-me.controller';
import { OrgMembershipService } from './org-membership.service';
import { ApiKeyModule } from './api-key/api-key.module';

@Module({
  imports: [
    ApiKeyModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
  controllers: [OrgJoinController, AuthRegisterController, UsersMeController],
  providers: [
    SupabaseAuthGuard,
    OrgMembershipGuard,
    GlobalAdminGuard,
    JwtOrApiKeyGuard,
    OrgMembershipService,
  ],
  exports: [
    SupabaseAuthGuard,
    OrgMembershipGuard,
    GlobalAdminGuard,
    JwtOrApiKeyGuard,
    OrgMembershipService,
  ],
})
export class AuthModule {}
