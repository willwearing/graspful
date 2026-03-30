import { Module } from '@nestjs/common';
import { VercelDomainsService } from './vercel-domains.service';
import { PostHogService } from './posthog.service';

@Module({
  providers: [VercelDomainsService, PostHogService],
  exports: [VercelDomainsService, PostHogService],
})
export class SharedApplicationModule {}
