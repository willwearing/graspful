import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';
import { ConnectService } from './connect.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private billing: BillingService,
    private connect: ConnectService,
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

    try {
      const event = this.billing.constructWebhookEvent(rawBody, signature);
      this.logger.log(`Received Stripe event: ${event.type}`);
      await this.billing.handleWebhookEvent(event);
      await this.handleConnectEvents(event);
      return res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook error: ${message}`);
      return res.status(400).json({ error: 'Webhook processing failed' });
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
