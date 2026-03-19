import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { BillingService } from './billing.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private billing: BillingService) {}

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
      return res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook error: ${message}`);
      return res.status(400).json({ error: message });
    }
  }
}
