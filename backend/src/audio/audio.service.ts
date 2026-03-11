import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AudioService {
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async getSignedUrl(
    orgId: string,
    studyItemId: string,
    voice = 'af_heart',
    expiresIn = 3600,
  ) {
    const audioFile = await this.prisma.audioFile.findFirst({
      where: {
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
      },
    });

    if (!audioFile) throw new NotFoundException('Audio not found');

    const { data, error } = await this.supabase.storage
      .from(audioFile.storageBucket)
      .createSignedUrl(audioFile.storagePath, expiresIn);

    if (error) throw new Error(`Signed URL failed: ${error.message}`);

    return {
      url: data.signedUrl,
      durationSeconds: audioFile.durationSeconds,
      voice: audioFile.voice,
      format: audioFile.format,
      expiresIn,
    };
  }
}
