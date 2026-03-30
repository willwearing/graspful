import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import type { Request } from 'express';

export interface PostHogContext {
  distinctId: string;
  sessionId?: string;
}

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    if (apiKey) {
      this.client = new PostHog(apiKey, {
        host: this.config.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com',
        flushAt: 10,
        flushInterval: 5000,
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

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
