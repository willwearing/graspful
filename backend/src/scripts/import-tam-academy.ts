/**
 * Imports the PostHog TAM Academy (4-course split) into the posthog-tam org.
 *
 * Usage:
 *   cd backend && npx ts-node -r tsconfig-paths/register src/scripts/import-tam-academy.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AcademyImporterService } from '@/knowledge-graph/academy-importer.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const importer = app.get(AcademyImporterService);

  // 1. Ensure posthog-tam organization exists
  const org = await prisma.organization.upsert({
    where: { slug: 'posthog-tam' },
    update: { name: 'PostHog TAM' },
    create: {
      slug: 'posthog-tam',
      name: 'PostHog TAM',
      niche: 'posthog',
      settings: {
        domain: 'posthog-tam.vercel.app',
        brandId: 'posthog',
      },
    },
  });
  console.log(`Organization: ${org.id} (${org.slug})`);

  // 2. Ensure subscription exists
  await prisma.subscription.upsert({
    where: { orgId: org.id },
    update: { plan: 'free', status: 'active', maxMembers: 1000 },
    create: {
      orgId: org.id,
      stripeCustomerId: `cus_seed_${org.slug}`,
      plan: 'free',
      status: 'active',
      maxMembers: 1000,
    },
  });

  // 3. Read academy manifest and course YAMLs
  const academyDir = path.resolve(
    __dirname,
    '../../../content/academies/posthog-tam',
  );
  const manifestYaml = fs.readFileSync(
    path.join(academyDir, 'academy.yaml'),
    'utf-8',
  );

  const courseFiles = [
    'courses/data-models.yaml',
    'courses/data-pipelines.yaml',
    'courses/posthog-data-model.yaml',
    'courses/posthog-ingestion-pipeline.yaml',
  ];

  const courseYamls: Record<string, string> = {};
  for (const file of courseFiles) {
    courseYamls[file] = fs.readFileSync(
      path.join(academyDir, file),
      'utf-8',
    );
    console.log(`  Loaded: ${file}`);
  }

  // 4. Import the academy
  console.log('\nImporting academy...');
  const result = await importer.importFromManifest(
    manifestYaml,
    courseYamls,
    org.id,
    { replace: true },
  );

  console.log('\nAcademy imported successfully!');
  console.log(`  Academy ID: ${result.academyId}`);
  console.log(`  Academy slug: ${result.academySlug}`);
  console.log(`  Parts: ${result.partCount}`);
  console.log(`  Courses: ${result.courseCount}`);

  for (const cr of result.courseResults) {
    console.log(`\n  Course: ${cr.courseId}`);
    console.log(`    Concepts: ${cr.conceptCount}`);
    console.log(`    Knowledge Points: ${cr.knowledgePointCount}`);
    console.log(`    Problems: ${cr.problemCount}`);
    console.log(`    Prerequisite Edges: ${cr.prerequisiteEdgeCount}`);
    console.log(`    Encompassing Edges: ${cr.encompassingEdgeCount}`);
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of result.warnings) {
      console.log(`  - ${w}`);
    }
  }

  await app.close();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
