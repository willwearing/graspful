import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@graspful/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
