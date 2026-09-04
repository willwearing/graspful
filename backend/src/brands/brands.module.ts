import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandAccessService } from './brand-access.service';
import { BrandsController } from './brands.controller';
import { AuthModule } from '@/auth/auth.module';
import { SharedApplicationModule } from '@/shared/application/shared-application.module';

@Module({
  imports: [AuthModule, SharedApplicationModule],
  controllers: [BrandsController],
  providers: [BrandsService, BrandAccessService],
  exports: [BrandsService, BrandAccessService],
})
export class BrandsModule {}
