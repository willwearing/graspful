import { Module } from '@nestjs/common';
import { CourseScopeGuard } from './guards/course-scope.guard';
import { AcademyScopeGuard } from './guards/academy-scope.guard';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { OrgMembershipGuard } from './guards/org-membership.guard';
import { GlobalAdminGuard } from './guards/global-admin.guard';
import { JwtOrApiKeyGuard } from './guards/jwt-or-apikey.guard';
import { OrgJoinController } from './org-join.controller';
import { AuthRegisterController } from './auth-register.controller';
import { AuthLoginController } from './auth-login.controller';
import { AuthProvisionController } from './auth-provision.controller';
import { CliAuthController } from './cli-auth.controller';
import { UsersMeController } from './users-me.controller';
import { OrgMembershipService } from './org-membership.service';
import { CliAuthService } from './cli-auth.service';
import { RegistrationService } from './registration.service';
import { AuthLoginService } from './auth-login.service';
import { ProvisionService } from './provision.service';
import { ApiKeyModule } from './api-key/api-key.module';
import { ApiKeyController } from './api-key/api-key.controller';
import { SharedApplicationModule } from '@/shared/application/shared-application.module';
import { MyOrganizationsQueryService } from './queries/my-organizations.query';

@Module({
  imports: [
    ApiKeyModule,
    SharedApplicationModule,
  ],
  controllers: [
    OrgJoinController,
    AuthRegisterController,
    AuthLoginController,
    AuthProvisionController,
    CliAuthController,
    UsersMeController,
    ApiKeyController,
  ],
  providers: [
    SupabaseAuthGuard,
    OrgMembershipGuard,
    CourseScopeGuard,
    AcademyScopeGuard,
    GlobalAdminGuard,
    JwtOrApiKeyGuard,
    OrgMembershipService,
    CliAuthService,
    RegistrationService,
    AuthLoginService,
    ProvisionService,
    MyOrganizationsQueryService,
  ],
  exports: [
    ApiKeyModule,
    SupabaseAuthGuard,
    OrgMembershipGuard,
    CourseScopeGuard,
    AcademyScopeGuard,
    GlobalAdminGuard,
    JwtOrApiKeyGuard,
    OrgMembershipService,
    MyOrganizationsQueryService,
  ],
})
export class AuthModule {}
