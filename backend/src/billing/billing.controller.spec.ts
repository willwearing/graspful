import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PostHogService } from '@/shared/application/posthog.service';
import { JwtOrApiKeyGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('BillingController', () => {
  let controller: BillingController;
  let mockBillingService: any;

  beforeEach(async () => {
    mockBillingService = {
      createCheckoutSession: jest.fn(),
      createPortalSession: jest.fn(),
      getSubscription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        { provide: PostHogService, useValue: { capture: jest.fn() } },
      ],
    })
      .overrideGuard(JwtOrApiKeyGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(BillingController);
  });

  const org = { orgId: 'org-1', role: 'admin' as const, userId: 'user-1', email: 'test@test.com' };

  describe('createCheckout', () => {
    it('should return checkout URL', async () => {
      mockBillingService.createCheckoutSession.mockResolvedValue('https://checkout.stripe.com/xxx');

      const result = await controller.createCheckout(org, {
        plan: 'individual',
        returnUrl: '/app',
      });

      expect(result).toEqual({ url: 'https://checkout.stripe.com/xxx' });
      expect(mockBillingService.createCheckoutSession).toHaveBeenCalledWith(
        'org-1',
        'individual',
        'month',
        '/app/settings?billing=success',
        '/app/settings?billing=canceled',
      );
    });

    it('should pass interval when specified', async () => {
      mockBillingService.createCheckoutSession.mockResolvedValue('https://checkout.stripe.com/xxx');

      await controller.createCheckout(org, {
        plan: 'team',
        interval: 'year',
        returnUrl: '/app',
      });

      expect(mockBillingService.createCheckoutSession).toHaveBeenCalledWith(
        'org-1',
        'team',
        'year',
        '/app/settings?billing=success',
        '/app/settings?billing=canceled',
      );
    });
  });

  describe('createPortal', () => {
    it('should return portal URL', async () => {
      mockBillingService.createPortalSession.mockResolvedValue('https://billing.stripe.com/xxx');

      const result = await controller.createPortal(org, { returnUrl: 'https://app.com/settings' });

      expect(result).toEqual({ url: 'https://billing.stripe.com/xxx' });
    });
  });

  describe('getSubscription', () => {
    it('should return subscription details', async () => {
      const sub = { plan: 'individual', status: 'active', maxMembers: 1 };
      mockBillingService.getSubscription.mockResolvedValue(sub);

      const result = await controller.getSubscription(org);

      expect(result).toEqual(sub);
    });
  });
});
