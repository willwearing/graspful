import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, MinRole } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { AudioGenerationService } from './audio-generation.service';

interface GenerateBody {
  voices?: string[];
  examId?: string;
  concurrency?: number;
}

@Controller('orgs/:orgId/content')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AudioGenerationController {
  constructor(private generationService: AudioGenerationService) {}

  @Post('generate')
  @MinRole('admin')
  async generate(
    @CurrentOrg() org: OrgContext,
    @Body() body: GenerateBody,
  ) {
    const voices = body.voices ?? ['af_heart'];
    const concurrency = body.concurrency ?? 5;

    const job = await this.generationService.createJob(org.orgId, voices, body.examId);

    // Kick off generation in background (don't await)
    this.generationService
      .runBatchGeneration(org.orgId, voices, concurrency, job.id, body.examId)
      .catch(() => {
        // Error handling is inside runBatchGeneration
      });

    return {
      jobId: job.id,
      itemCount: 0,
      status: 'pending',
    };
  }

  @Get('jobs')
  async listJobs(@CurrentOrg() org: OrgContext) {
    return this.generationService.listJobs(org.orgId);
  }
}
