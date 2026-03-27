import { Module } from '@nestjs/common';
import { VercelDomainsService } from './vercel-domains.service';

@Module({
  providers: [VercelDomainsService],
  exports: [VercelDomainsService],
})
export class SharedApplicationModule {}
