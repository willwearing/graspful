import { initOtel } from './telemetry/otel-logger';

// OTel SDK must initialize before NestJS bootstrap
initOtel();

import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import helmet from 'helmet';
import { LoggingInterceptor } from './telemetry/logging.interceptor';
import { OtelExceptionFilter } from './telemetry/exception.filter';
import { PostHogService } from './shared/application/posthog.service';

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

  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const allowedOrigins = config.get<string>('ALLOWED_ORIGINS')?.split(',').filter(Boolean);
  if (config.get('NODE_ENV') === 'production' && (!allowedOrigins || allowedOrigins.length === 0)) {
    console.warn('⚠ ALLOWED_ORIGINS is not set — CORS will reject all cross-origin requests');
  }
  app.enableCors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Telemetry: structured logging via OpenTelemetry -> PostHog
  app.useGlobalInterceptors(
    new LoggingInterceptor(app.get(Reflector, { strict: false }) ?? new Reflector()),
  );
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new OtelExceptionFilter(httpAdapterHost.httpAdapter, app.get(PostHogService)));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);

  app.enableShutdownHooks();
}
bootstrap();
