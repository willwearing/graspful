import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { ApiKeyService } from './api-key/api-key.service';
import { ProvisionService } from './provision.service';

export type CliAuthMode = 'sign-in' | 'sign-up';

type CliAuthSessionRecord = {
  id: string;
  tokenHash: string;
  mode: string;
  userId: string | null;
  orgId: string | null;
  encryptedApiKey: string | null;
  authorizedAt: Date | null;
  expiresAt: Date;
};

@Injectable()
export class CliAuthService {
  private readonly logger = new Logger(CliAuthService.name);
  private readonly sessionTtlMs = 15 * 60_000;
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyService: ApiKeyService,
    private readonly provisionService: ProvisionService,
    config: ConfigService,
  ) {
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'))
      .digest();
  }

  async start(mode: CliAuthMode) {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.prisma.cliAuthSession.create({
      data: {
        tokenHash,
        mode,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      pollIntervalMs: 2_000,
    };
  }

  async authorize(token: string, userId: string, email: string) {
    const session = await this.getRequiredSession(token);
    const { orgId, orgSlug } = await this.provisionService.ensureUserOrg(userId, email);

    const encryptedApiKey = session.encryptedApiKey
      ?? await this.issueEncryptedApiKey(orgId, userId, orgSlug);

    await this.prisma.cliAuthSession.update({
      where: { id: session.id },
      data: {
        userId,
        orgId,
        authorizedAt: new Date(),
        encryptedApiKey,
      },
    });

    return {
      authorized: true,
      orgSlug,
    };
  }

  async exchange(token: string) {
    const session = await this.getSessionByToken(token);
    if (!session || this.isExpired(session)) {
      return { status: 'expired' as const };
    }

    if (!session.encryptedApiKey || !session.userId || !session.orgId) {
      return { status: 'pending' as const };
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: session.orgId },
      select: { slug: true },
    });

    if (!org) {
      this.logger.warn(`CLI auth session ${session.id} references missing org ${session.orgId}`);
      return { status: 'expired' as const };
    }

    return {
      status: 'complete' as const,
      apiKey: this.decrypt(session.encryptedApiKey),
      orgSlug: org.slug,
      userId: session.userId,
    };
  }

  private async issueEncryptedApiKey(orgId: string, userId: string, orgSlug: string) {
    const { key } = await this.apiKeyService.createKey(
      orgId,
      userId,
      `cli-${orgSlug}-${Date.now().toString(36)}`,
    );
    return this.encrypt(key);
  }

  private async getRequiredSession(token: string) {
    const session = await this.getSessionByToken(token);
    if (!session) {
      throw new UnauthorizedException('Invalid CLI auth token');
    }
    if (this.isExpired(session)) {
      throw new GoneException('CLI auth session expired. Start again from the terminal.');
    }
    if (session.mode !== 'sign-in' && session.mode !== 'sign-up') {
      throw new BadRequestException('CLI auth session is invalid');
    }
    return session;
  }

  private async getSessionByToken(token: string): Promise<CliAuthSessionRecord | null> {
    if (!token) return null;

    return this.prisma.cliAuthSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: {
        id: true,
        tokenHash: true,
        mode: true,
        userId: true,
        orgId: true,
        encryptedApiKey: true,
        authorizedAt: true,
        expiresAt: true,
      },
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private isExpired(session: Pick<CliAuthSessionRecord, 'expiresAt'>) {
    return session.expiresAt.getTime() <= Date.now();
  }

  private encrypt(value: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
  }

  private decrypt(payload: string) {
    const buffer = Buffer.from(payload, 'base64url');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
