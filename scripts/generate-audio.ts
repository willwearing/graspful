/**
 * CLI script to trigger batch audio generation for an org.
 *
 * Usage:
 *   cd backend && npx ts-node ../scripts/generate-audio.ts --orgId <uuid> [--voices af_heart,am_adam] [--concurrency 5]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { AudioGenerationService } from '../backend/src/audio-generation/audio-generation.service';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }

  if (!parsed.orgId) {
    console.error('Usage: npx ts-node scripts/generate-audio.ts --orgId <uuid> [--voices af_heart,am_adam] [--concurrency 5]');
    process.exit(1);
  }

  return {
    orgId: parsed.orgId,
    voices: parsed.voices ? parsed.voices.split(',') : ['af_heart'],
    concurrency: parsed.concurrency ? parseInt(parsed.concurrency, 10) : 5,
  };
}

async function main() {
  const { orgId, voices, concurrency } = parseArgs();

  console.log(`Starting audio generation for org ${orgId}`);
  console.log(`Voices: ${voices.join(', ')}`);
  console.log(`Concurrency: ${concurrency}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const generationService = app.get(AudioGenerationService);

  const job = await generationService.createJob(orgId, voices);
  console.log(`Created job ${job.id}`);

  const pending = await generationService.findPendingGenerations(orgId, voices);
  console.log(`Found ${pending.length} items pending generation`);

  if (pending.length === 0) {
    console.log('Nothing to generate. All audio is up to date.');
    await app.close();
    return;
  }

  console.log('Starting batch generation...');
  await generationService.runBatchGeneration(orgId, voices, concurrency, job.id);

  console.log('Generation complete.');
  await app.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
