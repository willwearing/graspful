import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import { PostHogService } from './posthog.service';

jest.mock('posthog-node', () => ({
  PostHog: jest.fn(),
}));

const capture = jest.fn();
const captureException = jest.fn();
const identify = jest.fn();
const shutdown = jest.fn();

function config(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('PostHogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PostHog as unknown as jest.Mock).mockImplementation(() => ({
      capture,
      captureException,
      identify,
      shutdown,
    }));
  });

  it('initializes PostHog with exception autocapture when configured', () => {
    new PostHogService(config({
      POSTHOG_API_KEY: 'phc_test',
      POSTHOG_HOST: 'https://us.i.posthog.com',
    }));

    expect(PostHog).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
      flushAt: 10,
      flushInterval: 5000,
      enableExceptionAutocapture: true,
    });
  });

  it('captures exceptions through the SDK error tracking helper', () => {
    const service = new PostHogService(config({
      POSTHOG_API_KEY: 'phc_test',
      POSTHOG_HOST: 'https://us.i.posthog.com',
    }));
    const error = new Error('Boom');

    service.captureException(error, 'user-1', { source: 'test' });

    expect(captureException).toHaveBeenCalledWith(error, 'user-1', {
      source: 'test',
    });
  });

  it('does nothing when no PostHog key is configured', () => {
    const service = new PostHogService(config({}));

    service.captureException(new Error('Ignored'), 'user-1');

    expect(PostHog).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });
});
