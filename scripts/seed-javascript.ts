/**
 * Seeds the javascript-prep organization and loads JavaScript Fundamentals course.
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   cd backend && npx ts-node ../scripts/seed-javascript.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { PrismaService } from '../backend/src/prisma/prisma.service';
import { CourseImporterService } from '../backend/src/knowledge-graph/course-importer.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const importer = app.get(CourseImporterService);

  // 1. Upsert organization
  const org = await prisma.organization.upsert({
    where: { slug: 'javascript-prep' },
    update: { name: 'JSPrep', niche: 'javascript' },
    create: {
      slug: 'javascript-prep',
      name: 'JSPrep',
      niche: 'javascript',
      settings: {
        domain: 'jsprep.audio',
        brandId: 'javascript',
      },
    },
  });
  console.log(`Organization: ${org.id} (${org.slug})`);

  // 2. Load JavaScript course YAML
  const yamlPath = path.resolve(__dirname, '../content/courses/javascript-fundamentals.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.error(`Course YAML not found at ${yamlPath}`);
    process.exit(1);
  }

  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  const result = await importer.importFromYaml(yamlContent, org.id, {
    replace: true,
  });

  console.log('JavaScript Fundamentals course loaded:');
  console.log(`  Course ID: ${result.courseId}`);
  console.log(`  Concepts: ${result.conceptCount}`);
  console.log(`  Knowledge Points: ${result.knowledgePointCount}`);
  console.log(`  Problems: ${result.problemCount}`);
  console.log(`  Prerequisite Edges: ${result.prerequisiteEdgeCount}`);
  console.log(`  Encompassing Edges: ${result.encompassingEdgeCount}`);

  // 3. Upsert free subscription for the org
  const sub = await prisma.subscription.upsert({
    where: { orgId: org.id },
    update: {
      plan: 'free',
      status: 'active',
      maxMembers: 1000,
    },
    create: {
      orgId: org.id,
      stripeCustomerId: `cus_seed_${org.slug}`,
      plan: 'free',
      status: 'active',
      maxMembers: 1000,
    },
  });
  console.log(`Subscription: ${sub.id} (${sub.plan})`);

  await app.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
