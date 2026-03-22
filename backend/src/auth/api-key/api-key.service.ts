import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private prisma: PrismaService) {}

  async createKey(
    orgId: string,
    userId: string,
    name: string,
  ): Promise<{ key: string; id: string }> {
    const rawKey = `gsk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: { orgId, userId, name, keyHash, keyPrefix },
    });

    return { key: rawKey, id: apiKey.id };
  }

  async validateKey(rawKey: string) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { org: true, user: true },
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update last used timestamp (fire-and-forget to avoid timing oracle)
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch((err) => this.logger.warn('Failed to update lastUsedAt', err));

    return apiKey;
  }

  async listKeys(orgId: string) {
    return this.prisma.apiKey.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revokeKey(id: string, orgId: string): Promise<void> {
    await this.prisma.apiKey.deleteMany({ where: { id, orgId } });
  }
}
