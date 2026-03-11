import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';

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

  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
