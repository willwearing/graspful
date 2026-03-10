/**
 * CLI script to load a course YAML into the database.
 * Idempotent: safe to re-run (deletes + recreates if course slug exists).
 *
 * Usage:
 *   cd backend && npx ts-node ../scripts/load-course.ts --orgId <uuid> --file ../content/electrical-nec/course.yaml
 */
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { CourseImporterService } from '../backend/src/knowledge-graph/course-importer.service';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  if (!parsed.orgId || !parsed.file) {
    console.error(
      'Usage: npx ts-node scripts/load-course.ts --orgId <uuid> --file <path-to-yaml>',
    );
    process.exit(1);
  }
  return { orgId: parsed.orgId, file: parsed.file };
}

async function main() {
  const { orgId, file } = parseArgs();

  const yamlContent = fs.readFileSync(file, 'utf-8');
  console.log(`Loading course from ${file} into org ${orgId}...`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const importer = app.get(CourseImporterService);
  const result = await importer.importFromYaml(yamlContent, orgId, {
    replace: true,
  });

  console.log('Import complete:');
  console.log(`  Course ID: ${result.courseId}`);
  console.log(`  Concepts: ${result.conceptCount}`);
  console.log(`  Knowledge Points: ${result.knowledgePointCount}`);
  console.log(`  Problems: ${result.problemCount}`);
  console.log(`  Prerequisite Edges: ${result.prerequisiteEdgeCount}`);
  console.log(`  Encompassing Edges: ${result.encompassingEdgeCount}`);
  if (result.warnings.length > 0) {
    console.log(`  Warnings: ${result.warnings.join(', ')}`);
  }

  await app.close();
}

main().catch((err) => {
  console.error('Failed to load course:', err);
  process.exit(1);
});
