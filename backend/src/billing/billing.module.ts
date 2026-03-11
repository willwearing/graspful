import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, SubscriptionGuard],
  exports: [BillingService, SubscriptionGuard],
})
export class BillingModule {}
