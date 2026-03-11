import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TtsService } from '@/tts/tts.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PendingItem {
  studyItemId: string;
  textContent: string;
  textHash: string;
  orgSlug: string;
  examSlug: string;
}

@Injectable()
export class AudioGenerationService {
  private readonly logger = new Logger(AudioGenerationService.name);
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private tts: TtsService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async findPendingGenerations(
    orgId: string,
    voices: string[],
    examId?: string,
  ): Promise<PendingItem[]> {
    const results: PendingItem[] = [];

    for (const voice of voices) {
      let items: PendingItem[];

      if (examId) {
        items = await this.prisma.$queryRaw<PendingItem[]>`
          SELECT
            si.id AS "studyItemId",
            si.text_content AS "textContent",
            si.text_hash AS "textHash",
            o.slug AS "orgSlug",
            e.slug AS "examSlug"
          FROM study_items si
          JOIN sections s ON si.section_id = s.id
          JOIN topics t ON s.topic_id = t.id
          JOIN exams e ON t.exam_id = e.id
          JOIN organizations o ON e.org_id = o.id
          WHERE o.id = ${orgId}::uuid
            AND e.id = ${examId}::uuid
            AND si.is_archived = false
            AND NOT EXISTS (
              SELECT 1 FROM audio_files af
              WHERE af.study_item_id = si.id
                AND af.voice = ${voice}
                AND af.text_hash = si.text_hash
                AND af.is_current = true
            )
        `;
      } else {
        items = await this.prisma.$queryRaw<PendingItem[]>`
          SELECT
            si.id AS "studyItemId",
            si.text_content AS "textContent",
            si.text_hash AS "textHash",
            o.slug AS "orgSlug",
            e.slug AS "examSlug"
          FROM study_items si
          JOIN sections s ON si.section_id = s.id
          JOIN topics t ON s.topic_id = t.id
          JOIN exams e ON t.exam_id = e.id
          JOIN organizations o ON e.org_id = o.id
          WHERE o.id = ${orgId}::uuid
            AND si.is_archived = false
            AND NOT EXISTS (
              SELECT 1 FROM audio_files af
              WHERE af.study_item_id = si.id
                AND af.voice = ${voice}
                AND af.text_hash = si.text_hash
                AND af.is_current = true
            )
        `;
      }

      results.push(...items);
    }

    // Deduplicate by studyItemId (a study item may appear for multiple voices)
    const seen = new Set<string>();
    return results.filter((item) => {
      if (seen.has(item.studyItemId)) return false;
      seen.add(item.studyItemId);
      return true;
    });
  }

  async generateAndUpload(
    item: PendingItem,
    voice: string,
    format = 'flac',
  ): Promise<void> {
    const audioBuffer = await this.tts.synthesize(item.textContent, voice, format);
    const storagePath = `audio/${item.orgSlug}/${item.examSlug}/${item.studyItemId}/${voice}.${format}`;

    const { error: uploadError } = await this.supabase.storage
      .from('audio')
      .upload(storagePath, audioBuffer, {
        contentType: `audio/${format}`,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed for ${item.studyItemId}: ${uploadError.message}`);
    }

    // Atomically swap isCurrent flag to avoid race conditions
    await this.prisma.$transaction([
      this.prisma.audioFile.updateMany({
        where: {
          studyItemId: item.studyItemId,
          voice,
          isCurrent: true,
        },
        data: { isCurrent: false },
      }),
      this.prisma.audioFile.create({
        data: {
          studyItemId: item.studyItemId,
          voice,
          textHash: item.textHash,
          storagePath,
          storageBucket: 'audio',
          fileSizeBytes: audioBuffer.length,
          format,
          isCurrent: true,
        },
      }),
    ]);
  }

  async runBatchGeneration(
    orgId: string,
    voices: string[],
    concurrency: number,
    jobId: string,
    examId?: string,
  ): Promise<void> {
    await this.prisma.audioGenerationJob.update({
      where: { id: jobId },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    try {
      const pending = await this.findPendingGenerations(orgId, voices, examId);

      await this.prisma.audioGenerationJob.update({
        where: { id: jobId },
        data: { totalItems: pending.length },
      });

      if (pending.length === 0) {
        await this.prisma.audioGenerationJob.update({
          where: { id: jobId },
          data: { status: 'completed', completedAt: new Date() },
        });
        return;
      }

      let completedItems = 0;
      let failedItems = 0;
      const errorLog: Array<{ studyItemId: string; error: string }> = [];

      // Process with concurrency limit
      const queue = [...pending];
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;

          for (const voice of voices) {
            try {
              await this.generateAndUpload(item, voice);
              completedItems++;
            } catch (err) {
              failedItems++;
              const message = err instanceof Error ? err.message : String(err);
              errorLog.push({ studyItemId: item.studyItemId, error: message });
              this.logger.error(`Failed to generate audio for ${item.studyItemId}: ${message}`);
            }
          }

          // Update progress
          await this.prisma.audioGenerationJob.update({
            where: { id: jobId },
            data: { completedItems, failedItems, errorLog },
          });
        }
      });

      await Promise.all(workers);

      await this.prisma.audioGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedItems,
          failedItems,
          errorLog,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Batch generation failed: ${message}`);
      await this.prisma.audioGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorLog: [{ error: message }],
        },
      });
    }
  }

  async createJob(orgId: string, voices: string[], examId?: string) {
    return this.prisma.audioGenerationJob.create({
      data: {
        orgId,
        voices,
        status: 'pending',
        ...(examId && { examId }),
      },
    });
  }

  async listJobs(orgId: string) {
    return this.prisma.audioGenerationJob.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
