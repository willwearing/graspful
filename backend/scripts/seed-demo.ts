/** Run from backend: bun run seed:demo <electrical|javascript>. Safe to repeat. */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CourseImporterService } from '../src/knowledge-graph/course-importer.service';
import { parseDemoCourse, readDemoCourse, seedDemoCourse } from './seed-demo-config';

async function main() {
  const course = parseDemoCourse(process.argv.slice(2));
  // Resolve the file before opening the app or writing any records.
  const yaml = readDemoCourse(course);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const { org, result } = await seedDemoCourse(
      course, yaml, app.get(PrismaService), app.get(CourseImporterService),
    );
    console.log(`Organization: ${org.id} (${org.slug})`);
    console.log('Course loaded:', result);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
