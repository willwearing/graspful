import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
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
  private readonly logger = new Logger(AudioGenerationController.name);

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
      .catch((err) => {
        this.logger.error('Background audio generation failed', err);
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
