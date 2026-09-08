import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function billingUnavailable(message = 'Paid subscriptions are not available yet.') {
  return new ServiceUnavailableException({ code: 'BILLING_UNAVAILABLE', message });
}

/** Only a server-configured origin may receive a Stripe redirect. */
export function billingOrigin(config: ConfigService): string | null {
  const configured = config.get<string>('APP_URL');
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (config.get<string>('NODE_ENV') === 'production' && url.protocol !== 'https:')
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function billingReturnUrl(config: ConfigService, path: string): string {
  const origin = billingOrigin(config);
  if (!origin) throw billingUnavailable();
  const url = new URL(path, origin);
  if (url.origin !== origin || url.username || url.password) throw billingUnavailable();
  return url.toString();
}

export function stripeConfigured(config: ConfigService): boolean {
  return Boolean(config.get<string>('STRIPE_SECRET_KEY')?.trim());
}

export function billingConfigured(config: ConfigService): boolean {
  return stripeConfigured(config) && Boolean(
    billingOrigin(config) && config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim(),
  );
}
