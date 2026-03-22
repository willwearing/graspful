import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyController } from './api-key.controller';

@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
