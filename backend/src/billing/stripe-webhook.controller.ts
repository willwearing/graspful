import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { PostHogService } from '@/shared/application/posthog.service';
import { BillingService } from './billing.service';
import { ConnectService } from './connect.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private billing: BillingService,
    private connect: ConnectService,
    private posthog: PostHogService,
  ) {}

  @Post('stripe')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const rawBody = (req as any).rawBody as Buffer;
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing raw body' });
    }

    let event: Stripe.Event;
    try {
      event = this.billing.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${message}`);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    try {
      this.logger.log(`Received Stripe event: ${event.type}`);
      await this.billing.handleWebhookEvent(event);
      await this.handleConnectEvents(event);
      this.captureSubscriptionEvents(event);
      return res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook processing error: ${message}`);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private captureSubscriptionEvents(event: Stripe.Event): void {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        if (orgId) {
          this.posthog.capture({ distinctId: orgId }, 'subscription activated', {
            org_id: orgId,
            plan: session.metadata?.plan,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          this.posthog.capture({ distinctId: orgId }, 'subscription canceled', {
            org_id: orgId,
          });
        }
        break;
      }
    }
  }

  private async handleConnectEvents(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'account.updated':
        await this.connect.handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = invoice.metadata?.orgId;
        if (orgId && invoice.id && invoice.amount_paid > 0) {
          await this.connect.recordRevenueEvent(
            orgId,
            invoice.id,
            invoice.amount_paid,
            invoice.currency,
          );
        }
        break;
      }
    }
  }
}
