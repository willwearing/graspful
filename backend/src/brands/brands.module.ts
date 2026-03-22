import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { VercelDomainsService } from './vercel-domains.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, VercelDomainsService],
  exports: [BrandsService, VercelDomainsService],
})
export class BrandsModule {}
