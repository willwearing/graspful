import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import type { Request } from 'express';

export interface PostHogContext {
  distinctId: string;
  sessionId?: string;
}

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly logger = new Logger(PostHogService.name);
  private client: PostHog | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    if (apiKey) {
      this.client = new PostHog(apiKey, {
        host: this.config.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com',
        flushAt: 10,
        flushInterval: 5000,
        enableExceptionAutocapture: true,
      });
    }
  }

  /** Extract PostHog context from incoming request headers. */
  extractContext(req: Request, fallbackDistinctId: string): PostHogContext {
    return {
      distinctId: req.headers['x-posthog-distinct-id'] as string || fallbackDistinctId,
      sessionId: req.headers['x-posthog-session-id'] as string || undefined,
    };
  }

  capture(ctx: PostHogContext, event: string, properties: Record<string, unknown> = {}) {
    if (!this.client) return;
    this.client.capture({
      distinctId: ctx.distinctId,
      event,
      properties: {
        ...properties,
        ...(ctx.sessionId ? { $session_id: ctx.sessionId } : {}),
      },
    });
  }

  identify(distinctId: string, properties: Record<string, unknown> = {}) {
    if (!this.client) return;
    this.client.identify({ distinctId, properties });
  }

  /** Emit only after the transaction that creates the account's first org commits. */
  recordAccountCreated(account: {
    userId: string;
    email: string;
    orgId: string;
    orgSlug: string;
    source: 'provision' | 'registration';
  }): void {
    if (!this.client) return;

    try {
      this.client.identify({ distinctId: account.userId, properties: { email: account.email } });
      this.client.capture({
        // Supabase user IDs are UUIDs. Reusing this event ID lets ingestion deduplicate retries.
        uuid: account.userId,
        distinctId: account.userId,
        event: 'account_created',
        properties: {
          email: account.email,
          org_id: account.orgId,
          org_slug: account.orgSlug,
          source: account.source,
          environment: this.config.get<string>('NODE_ENV') || 'development',
        },
      });
    } catch {
      // An analytics outage must not undo a committed account or block sign-in.
      this.logger.warn('Could not queue the account_created event');
    }
  }

  captureException(error: Error, distinctId: string, properties: Record<string, unknown> = {}) {
    if (!this.client) return;
    this.client.captureException(error, distinctId, properties);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
