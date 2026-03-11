import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { TtsService } from '@/tts/tts.service';
import { AudioGenerationService } from './audio-generation.service';

// Mock supabase
const mockUpload = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

describe('AudioGenerationService', () => {
  let service: AudioGenerationService;
  let mockPrisma: any;
  let mockTts: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn().mockResolvedValue([]),
      audioFile: {
        create: jest.fn().mockResolvedValue({ id: 'af-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      audioGenerationJob: {
        create: jest.fn().mockResolvedValue({ id: 'job-1' }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockTts = {
      synthesize: jest.fn().mockResolvedValue(Buffer.from([1, 2, 3])),
    };

    const mockConfig = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key-long-enough-for-validation',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    service = new AudioGenerationService(
      mockPrisma as unknown as PrismaService,
      mockConfig,
      mockTts as unknown as TtsService,
    );

    mockUpload.mockReset();
  });

  describe('findPendingGenerations', () => {
    it('should query for study items without matching audio', async () => {
      const items = [
        {
          studyItemId: 'si-1',
          textContent: 'Hello',
          textHash: 'abc123',
          orgSlug: 'org-1',
          examSlug: 'exam-1',
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(items);

      const result = await service.findPendingGenerations('org-id', ['af_heart']);

      expect(result).toEqual(items);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate results across voices', async () => {
      const item = {
        studyItemId: 'si-1',
        textContent: 'Hello',
        textHash: 'abc',
        orgSlug: 'org',
        examSlug: 'exam',
      };
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([item])
        .mockResolvedValueOnce([{ ...item }]); // Same item from second voice

      const result = await service.findPendingGenerations('org-id', [
        'af_heart',
        'am_adam',
      ]);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no pending items', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const result = await service.findPendingGenerations('org-id', ['af_heart']);
      expect(result).toEqual([]);
    });
  });

  describe('generateAndUpload', () => {
    const item = {
      studyItemId: 'si-1',
      textContent: 'Short text.',
      textHash: 'abc123',
      orgSlug: 'my-org',
      examSlug: 'my-exam',
    };

    it('should call TTS, upload, and create AudioFile record', async () => {
      mockUpload.mockResolvedValue({ error: null });

      await service.generateAndUpload(item, 'af_heart');

      // TTS called
      expect(mockTts.synthesize).toHaveBeenCalledWith(
        'Short text.',
        'af_heart',
        'flac',
      );

      // Upload called with correct path
      expect(mockUpload).toHaveBeenCalledWith(
        'audio/my-org/my-exam/si-1/af_heart.flac',
        expect.any(Buffer),
        { contentType: 'audio/flac', upsert: true },
      );

      // Atomic swap via $transaction
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw on upload failure', async () => {
      mockUpload.mockResolvedValue({
        error: { message: 'Storage full' },
      });

      await expect(service.generateAndUpload(item, 'af_heart')).rejects.toThrow(
        'Upload failed for si-1: Storage full',
      );
    });
  });

  describe('runBatchGeneration', () => {
    it('should complete immediately when no pending items', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.runBatchGeneration('org-id', ['af_heart'], 3, 'job-1');

      // Job should be marked completed
      const updateCalls = mockPrisma.audioGenerationJob.update.mock.calls;
      const lastCall = updateCalls[updateCalls.length - 1][0];
      expect(lastCall.data.status).toBe('completed');
    });

    it('should process pending items and update job progress', async () => {
      const items = [
        {
          studyItemId: 'si-1',
          textContent: 'Hello',
          textHash: 'abc',
          orgSlug: 'org',
          examSlug: 'exam',
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(items);
      mockUpload.mockResolvedValue({ error: null });

      await service.runBatchGeneration('org-id', ['af_heart'], 1, 'job-1');

      expect(mockTts.synthesize).toHaveBeenCalled();

      // Job marked processing, then completed
      const statusUpdates = mockPrisma.audioGenerationJob.update.mock.calls.map(
        (c: any) => c[0].data.status,
      ).filter(Boolean);
      expect(statusUpdates).toContain('in_progress');
      expect(statusUpdates).toContain('completed');
    });

    it('should handle TTS failures gracefully', async () => {
      const items = [
        {
          studyItemId: 'si-1',
          textContent: 'Hello',
          textHash: 'abc',
          orgSlug: 'org',
          examSlug: 'exam',
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(items);
      mockTts.synthesize.mockRejectedValue(new Error('TTS down'));

      await service.runBatchGeneration('org-id', ['af_heart'], 1, 'job-1');

      // Job still completes (with failures tracked)
      const lastUpdate = mockPrisma.audioGenerationJob.update.mock.calls.at(-1)[0];
      expect(lastUpdate.data.status).toBe('completed');
      expect(lastUpdate.data.failedItems).toBe(1);
    });
  });

  describe('createJob', () => {
    it('should create an AudioGenerationJob', async () => {
      await service.createJob('org-id', ['af_heart']);

      expect(mockPrisma.audioGenerationJob.create).toHaveBeenCalledWith({
        data: {
          orgId: 'org-id',
          voices: ['af_heart'],
          status: 'pending',
        },
      });
    });
  });

  describe('listJobs', () => {
    it('should list jobs for an org ordered by creation date desc', async () => {
      const jobs = [{ id: 'j-1' }, { id: 'j-2' }];
      mockPrisma.audioGenerationJob.findMany.mockResolvedValue(jobs);

      const result = await service.listJobs('org-id');

      expect(result).toEqual(jobs);
      expect(mockPrisma.audioGenerationJob.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-id' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
