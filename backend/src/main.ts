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
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  // Preserve raw body for Stripe webhook signature verification
  app.use(
    json({
      limit: '2mb',
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

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const defaultLocalOrigins =
    nodeEnv === 'production'
      ? []
      : [
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
      ];

  // Static origins from env var plus local development app hosts.
  const staticOrigins = new Set(
    [
      ...defaultLocalOrigins,
      ...(config.get<string>('ALLOWED_ORIGINS')?.split(',') ?? []),
    ]
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  // Dynamic CORS: static origins are checked first, then brand domains from DB (cached 5 min)
  const prisma = app.get(PrismaService);
  let brandDomainCache: Set<string> = new Set();
  let cacheExpiresAt = 0;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  async function loadBrandDomains(): Promise<Set<string>> {
    const now = Date.now();
    if (now < cacheExpiresAt) return brandDomainCache;
    try {
      const brands = await prisma.brand.findMany({
        where: { isActive: true },
        select: { domain: true },
      });
      brandDomainCache = new Set(
        brands.map((b) => `https://${b.domain}`),
      );
      cacheExpiresAt = now + CACHE_TTL_MS;
    } catch (err) {
      console.error('Failed to load brand domains for CORS:', err);
      // Keep stale cache on error
      cacheExpiresAt = now + 30_000;
    }
    return brandDomainCache;
  }

  app.enableCors({
    origin: async (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (staticOrigins.has(origin)) return callback(null, true);

      const domains = await loadBrandDomains();
      if (domains.has(origin)) return callback(null, true);

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
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
