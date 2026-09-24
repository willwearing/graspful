import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ __loaded: false, init: vi.fn() }));
vi.mock('posthog-js', () => ({ default: sdk }));

beforeEach(() => {
  vi.resetModules();
  sdk.__loaded = false;
  sdk.init.mockReset().mockImplementation(() => { sdk.__loaded = true; });
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://events.example.test');
});
afterEach(() => vi.unstubAllEnvs());

describe('shared browser telemetry initialization', () => {
  it('leaves telemetry disabled when no project key is configured', async () => {
    await import('../../instrumentation-client');
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('initializes site request tracing once with the configured host and service name', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-project-key');
    await import('../../instrumentation-client');
    const { initPostHog } = await import('@graspful/creator-ui/posthog-client');
    initPostHog('graspful-site');
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.init).toHaveBeenCalledWith('test-project-key', expect.objectContaining({
      api_host: 'https://events.example.test',
      capture_pageview: false,
      person_profiles: 'identified_only',
      logs: expect.objectContaining({ serviceName: 'graspful-site' }),
    }));
  });

  it('preserves the web service name for existing callers', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-project-key');
    const { initPostHog } = await import('@graspful/creator-ui/posthog-client');
    initPostHog();
    expect(sdk.init).toHaveBeenCalledWith('test-project-key', expect.objectContaining({
      logs: expect.objectContaining({ serviceName: 'graspful-web' }),
    }));
  });
});
