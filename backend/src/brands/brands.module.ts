import { Module, forwardRef } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { VercelDomainsService } from './vercel-domains.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [BrandsController],
  providers: [BrandsService, VercelDomainsService],
  exports: [BrandsService, VercelDomainsService],
})
export class BrandsModule {}
