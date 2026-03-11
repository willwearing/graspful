import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { AudioService } from './audio.service';

@Controller('api/v1/orgs/:orgId/audio')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AudioController {
  constructor(private audioService: AudioService) {}

  @Get(':studyItemId')
  async getAudio(
    @CurrentOrg() org: OrgContext,
    @Param('studyItemId') studyItemId: string,
    @Query('voice') voice?: string,
  ) {
    return this.audioService.getSignedUrl(org.orgId, studyItemId, voice);
  }
}
