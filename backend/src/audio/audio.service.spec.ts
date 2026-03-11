import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AudioService } from './audio.service';

// Mock the supabase client
const mockCreateSignedUrl = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  }),
}));

describe('AudioService', () => {
  let service: AudioService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      audioFile: {
        findFirst: jest.fn(),
      },
    };

    const mockConfig = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-that-is-long-enough',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    service = new AudioService(
      mockPrisma as unknown as PrismaService,
      mockConfig,
    );

    mockCreateSignedUrl.mockReset();
  });

  describe('getSignedUrl', () => {
    const orgId = 'org-1';
    const expectedWhere = (studyItemId: string, voice: string) => ({
      studyItemId,
      voice,
      isCurrent: true,
      studyItem: {
        section: {
          topic: {
            exam: {
              orgId,
            },
          },
        },
      },
    });

    it('should return signed URL when audio file exists', async () => {
      const audioFile = {
        id: 'af-1',
        studyItemId: 'si-1',
        voice: 'af_heart',
        storageBucket: 'audio',
        storagePath: 'audio/org/exam/si-1/af_heart.flac',
        durationSeconds: 45.5,
        format: 'flac',
        isCurrent: true,
      };

      mockPrisma.audioFile.findFirst.mockResolvedValue(audioFile);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/signed/abc123' },
        error: null,
      });

      const result = await service.getSignedUrl(orgId, 'si-1');

      expect(result).toEqual({
        url: 'https://supabase.co/storage/signed/abc123',
        durationSeconds: 45.5,
        voice: 'af_heart',
        format: 'flac',
        expiresIn: 3600,
      });

      expect(mockPrisma.audioFile.findFirst).toHaveBeenCalledWith({
        where: expectedWhere('si-1', 'af_heart'),
      });
    });

    it('should use custom voice parameter', async () => {
      const audioFile = {
        id: 'af-2',
        studyItemId: 'si-1',
        voice: 'am_adam',
        storageBucket: 'audio',
        storagePath: 'audio/org/exam/si-1/am_adam.flac',
        durationSeconds: 30,
        format: 'flac',
        isCurrent: true,
      };

      mockPrisma.audioFile.findFirst.mockResolvedValue(audioFile);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/signed/xyz' },
        error: null,
      });

      const result = await service.getSignedUrl(orgId, 'si-1', 'am_adam');

      expect(result.voice).toBe('am_adam');
      expect(mockPrisma.audioFile.findFirst).toHaveBeenCalledWith({
        where: expectedWhere('si-1', 'am_adam'),
      });
    });

    it('should throw NotFoundException when no audio file exists', async () => {
      mockPrisma.audioFile.findFirst.mockResolvedValue(null);

      await expect(service.getSignedUrl(orgId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when signed URL creation fails', async () => {
      mockPrisma.audioFile.findFirst.mockResolvedValue({
        id: 'af-1',
        studyItemId: 'si-1',
        voice: 'af_heart',
        storageBucket: 'audio',
        storagePath: 'audio/org/exam/si-1/af_heart.flac',
        durationSeconds: 45.5,
        format: 'flac',
        isCurrent: true,
      });

      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      await expect(service.getSignedUrl(orgId, 'si-1')).rejects.toThrow(
        'Signed URL failed: Storage error',
      );
    });

    it('should use custom expiresIn', async () => {
      mockPrisma.audioFile.findFirst.mockResolvedValue({
        id: 'af-1',
        studyItemId: 'si-1',
        voice: 'af_heart',
        storageBucket: 'audio',
        storagePath: 'path',
        durationSeconds: 10,
        format: 'flac',
        isCurrent: true,
      });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://url' },
        error: null,
      });

      const result = await service.getSignedUrl(orgId, 'si-1', 'af_heart', 7200);
      expect(result.expiresIn).toBe(7200);
    });
  });
});
