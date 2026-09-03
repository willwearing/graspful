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
import {
  buildStaticOrigins,
  createCorsOriginGuard,
  isOriginAllowed,
} from './config/cors';

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

  // Static origins: the API's own origin, local dev app hosts, and ALLOWED_ORIGINS.
  const staticOrigins = buildStaticOrigins({
    nodeEnv: config.get<string>('NODE_ENV', 'development'),
    allowedOrigins: config.get<string>('ALLOWED_ORIGINS'),
  });

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

  // Stop disallowed browser origins before a simple request can reach a route.
  // Return a normal 403 response so expected denials do not enter error tracking.
  app.use(createCorsOriginGuard(staticOrigins, loadBrandDomains));

  app.enableCors({
    origin: async (origin, callback) => {
      // Fast paths: no-origin requests (server-to-server, curl) and known
      // static origins are allowed without touching the DB.
      if (!origin || staticOrigins.has(origin)) return callback(null, true);

      const domains = await loadBrandDomains();
      // Rejections are expected cross-origin traffic, not server errors:
      // return `false` so the request is denied without throwing (which would
      // surface as an unhandled 500 in error tracking).
      callback(null, isOriginAllowed(origin, staticOrigins, domains));
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
