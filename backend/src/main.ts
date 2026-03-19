import { initOtel } from './telemetry/otel-logger';

// OTel SDK must initialize before NestJS bootstrap
initOtel();

import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { LoggingInterceptor } from './telemetry/logging.interceptor';
import { OtelExceptionFilter } from './telemetry/exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  // Preserve raw body for Stripe webhook signature verification
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Telemetry: structured logging via OpenTelemetry -> PostHog
  app.useGlobalInterceptors(
    new LoggingInterceptor(app.get(Reflector, { strict: false }) ?? new Reflector()),
  );
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new OtelExceptionFilter(httpAdapterHost.httpAdapter));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);

  app.enableShutdownHooks();
}
bootstrap();
