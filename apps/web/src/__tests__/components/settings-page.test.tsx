import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '@/app/(app)/settings/page';
import { requireAppSession } from '@/lib/app-session';
import { resolveCreatorOrgSlug } from '@/lib/creator-org';

vi.mock('@/lib/app-session', () => ({ requireAppSession: vi.fn() }));
vi.mock('@/lib/creator-org', () => ({ resolveCreatorOrgSlug: vi.fn() }));
vi.mock('@/components/app/billing-settings', () => ({ BillingSettings: ({ orgId }: { orgId: string }) => <p>Billing: {orgId}</p> }));
vi.mock('@/components/app/api-keys-settings', () => ({ ApiKeysSettings: ({ orgId }: { orgId: string }) => <p>API keys: {orgId}</p> }));

beforeEach(() => {
  vi.mocked(requireAppSession).mockResolvedValue({ token: 'token', user: { email: 'creator@example.com' }, brand: { orgSlug: 'platform' } } as Awaited<ReturnType<typeof requireAppSession>>);
  vi.mocked(resolveCreatorOrgSlug).mockResolvedValue('my-school');
});

it('scopes billing and credentials to the creator organization selected by membership', async () => {
  render(await SettingsPage());
  expect(resolveCreatorOrgSlug).toHaveBeenCalledWith('token', 'platform');
  expect(screen.getByText('Billing: my-school')).toBeVisible();
  expect(screen.getByText('API keys: my-school')).toBeVisible();
  expect(screen.getByText('creator@example.com')).toBeVisible();
});
