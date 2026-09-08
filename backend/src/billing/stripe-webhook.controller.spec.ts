import { ServiceUnavailableException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PostHogService } from '@/shared/application/posthog.service';
import { BillingService } from './billing.service';
import { ConnectService } from './connect.service';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  const billing = { constructWebhookEvent: jest.fn(), handleWebhookEvent: jest.fn() };
  const connect = { recordRevenueEvent: jest.fn(), handleAccountUpdated: jest.fn() };
  const posthog = { capture: jest.fn() };
  let response: { status: jest.Mock; json: jest.Mock };
  const request = { headers: { 'stripe-signature': 'fixture_signature' }, rawBody: Buffer.from('{}') } as unknown as Request;

  beforeEach(() => {
    jest.resetAllMocks();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    controller = new StripeWebhookController(
      billing as unknown as BillingService, connect as unknown as ConnectService, posthog as unknown as PostHogService,
    );
  });

  it('reports setup unavailable without processing an unsigned event', async () => {
    billing.constructWebhookEvent.mockImplementation(() => { throw new ServiceUnavailableException({ code: 'BILLING_UNAVAILABLE' }); });
    await controller.handleWebhook(request, response as unknown as Response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(billing.handleWebhookEvent).not.toHaveBeenCalled();
    expect(connect.recordRevenueEvent).not.toHaveBeenCalled();
  });

  it('records a connected invoice using subscription metadata from the v20 parent', async () => {
    billing.constructWebhookEvent.mockReturnValue({
      type: 'invoice.paid', account: 'acct_test', data: { object: {
        id: 'in_test', amount_paid: 1000, currency: 'usd', metadata: {},
        parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_test', metadata: { orgId: 'org-1' } } },
      } },
    });
    await controller.handleWebhook(request, response as unknown as Response);
    expect(connect.recordRevenueEvent).toHaveBeenCalledWith('org-1', 'in_test', 1000, 'usd');
    expect(response.json).toHaveBeenCalledWith({ received: true });
  });

  it.each(['paid', 'no_payment_required'])('tracks completed %s checkouts without claiming activation', async (paymentStatus) => {
    billing.constructWebhookEvent.mockReturnValue({
      type: 'checkout.session.completed', data: { object: {
        mode: 'subscription', payment_status: paymentStatus, metadata: { orgId: 'org-1', plan: 'individual' },
      } },
    });
    await controller.handleWebhook(request, response as unknown as Response);
    expect(posthog.capture).toHaveBeenCalledWith(
      { distinctId: 'org-1' }, 'subscription checkout completed', { org_id: 'org-1', plan: 'individual' },
    );
  });

  it('does not count an unpaid checkout as a completed subscription purchase', async () => {
    billing.constructWebhookEvent.mockReturnValue({
      type: 'checkout.session.completed', data: { object: {
        mode: 'subscription', payment_status: 'unpaid', metadata: { orgId: 'org-1', plan: 'individual' },
      } },
    });
    await controller.handleWebhook(request, response as unknown as Response);
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('does not count platform invoices as creator revenue', async () => {
    billing.constructWebhookEvent.mockReturnValue({
      type: 'invoice.paid', data: { object: {
        id: 'in_test', amount_paid: 1000, currency: 'usd',
        parent: { subscription_details: { metadata: { orgId: 'org-1' } } },
      } },
    });
    await controller.handleWebhook(request, response as unknown as Response);
    expect(connect.recordRevenueEvent).not.toHaveBeenCalled();
  });
});
