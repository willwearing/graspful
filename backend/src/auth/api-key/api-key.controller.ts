import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, MinRole } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('orgs/:orgId/api-keys')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post()
  @MinRole('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createKey(
    @Body() body: CreateApiKeyDto,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.apiKeyService.createKey(org.orgId, org.userId, body.name);
  }

  @Get()
  @MinRole('admin')
  async listKeys(@CurrentOrg() org: OrgContext) {
    return this.apiKeyService.listKeys(org.orgId);
  }

  @Delete(':keyId')
  @MinRole('admin')
  async revokeKey(
    @Param('keyId') keyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    await this.apiKeyService.revokeKey(keyId, org.orgId);
    return { deleted: true };
  }
}
