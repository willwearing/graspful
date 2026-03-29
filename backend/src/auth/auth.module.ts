import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { OrgMembershipGuard } from './guards/org-membership.guard';
import { GlobalAdminGuard } from './guards/global-admin.guard';
import { JwtOrApiKeyGuard } from './guards/jwt-or-apikey.guard';
import { OrgJoinController } from './org-join.controller';
import { AuthRegisterController } from './auth-register.controller';
import { AuthProvisionController } from './auth-provision.controller';
import { CliAuthController } from './cli-auth.controller';
import { UsersMeController } from './users-me.controller';
import { OrgMembershipService } from './org-membership.service';
import { CliAuthService } from './cli-auth.service';
import { RegistrationService } from './registration.service';
import { ProvisionService } from './provision.service';
import { ApiKeyModule } from './api-key/api-key.module';
import { ApiKeyController } from './api-key/api-key.controller';
import { SharedApplicationModule } from '@/shared/application/shared-application.module';
import { MyOrganizationsQueryService } from './queries/my-organizations.query';

@Module({
  imports: [
    ApiKeyModule,
    SharedApplicationModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
  controllers: [
    OrgJoinController,
    AuthRegisterController,
    AuthProvisionController,
    CliAuthController,
    UsersMeController,
    ApiKeyController,
  ],
  providers: [
    SupabaseAuthGuard,
    OrgMembershipGuard,
    GlobalAdminGuard,
    JwtOrApiKeyGuard,
    OrgMembershipService,
    CliAuthService,
    RegistrationService,
    ProvisionService,
    MyOrganizationsQueryService,
  ],
  exports: [
    ApiKeyModule,
    SupabaseAuthGuard,
    OrgMembershipGuard,
    GlobalAdminGuard,
    JwtOrApiKeyGuard,
    OrgMembershipService,
    MyOrganizationsQueryService,
  ],
})
export class AuthModule {}
