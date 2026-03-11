/**
 * Seeds the electrician-prep organization and loads NEC course content.
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   cd backend && npx ts-node ../scripts/seed-electrical.ts
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
    where: { slug: 'electrician-prep' },
    update: { name: 'ElectricianPrep', niche: 'electrical' },
    create: {
      slug: 'electrician-prep',
      name: 'ElectricianPrep',
      niche: 'electrical',
      settings: {
        domain: 'electricianprep.audio',
        brandId: 'electrician',
      },
    },
  });
  console.log(`Organization: ${org.id} (${org.slug})`);

  // 2. Load NEC course YAML
  const yamlPath = path.resolve(__dirname, '../content/electrical-nec/course.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.error(`Course YAML not found at ${yamlPath}`);
    process.exit(1);
  }

  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  const result = await importer.importFromYaml(yamlContent, org.id, {
    replace: true,
  });

  console.log('NEC course loaded:');
  console.log(`  Course ID: ${result.courseId}`);
  console.log(`  Concepts: ${result.conceptCount}`);
  console.log(`  Knowledge Points: ${result.knowledgePointCount}`);
  console.log(`  Problems: ${result.problemCount}`);
  console.log(`  Prerequisite Edges: ${result.prerequisiteEdgeCount}`);
  console.log(`  Encompassing Edges: ${result.encompassingEdgeCount}`);

  // 3. Upsert free subscription for the org
  const existingSub = await prisma.subscription.findUnique({
    where: { orgId: org.id },
  });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        orgId: org.id,
        stripeCustomerId: `cus_seed_${org.slug}`,
        plan: 'free',
        status: 'active',
        maxMembers: 1000,
      },
    });
    console.log('Created free subscription for org');
  } else {
    console.log('Subscription already exists -- skipping');
  }

  await app.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
