import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { SharedApplicationModule } from '@/shared/application/shared-application.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { ConnectController } from './connect.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { ConnectService } from './connect.service';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [AuthModule, SharedApplicationModule],
  controllers: [BillingController, ConnectController, StripeWebhookController],
  providers: [BillingService, ConnectService, SubscriptionGuard],
  exports: [BillingService, ConnectService, SubscriptionGuard],
})
export class BillingModule {}
