import { PATH_METADATA } from '@nestjs/common/constants';
import { AudioController } from '@/audio/audio.controller';
import { AudioGenerationController } from '@/audio-generation/audio-generation.controller';
import { BillingController } from '@/billing/billing.controller';
import { StripeWebhookController } from '@/billing/stripe-webhook.controller';

describe('Controller route paths', () => {
  it('keeps controller decorators relative to the global api/v1 prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AudioController)).toBe('orgs/:orgId/audio');
    expect(Reflect.getMetadata(PATH_METADATA, AudioGenerationController)).toBe(
      'orgs/:orgId/content',
    );
    expect(Reflect.getMetadata(PATH_METADATA, BillingController)).toBe(
      'orgs/:orgId/billing',
    );
    expect(Reflect.getMetadata(PATH_METADATA, StripeWebhookController)).toBe(
      'webhooks',
    );
  });
});
