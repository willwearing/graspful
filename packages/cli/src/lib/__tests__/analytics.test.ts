import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cliDistinctId } from '../analytics';

const originalUserId = process.env.GRASPFUL_USER_ID;
const originalApiKey = process.env.GRASPFUL_API_KEY;

afterEach(() => {
  if (originalUserId === undefined) {
    delete process.env.GRASPFUL_USER_ID;
  } else {
    process.env.GRASPFUL_USER_ID = originalUserId;
  }

  if (originalApiKey === undefined) {
    delete process.env.GRASPFUL_API_KEY;
  } else {
    process.env.GRASPFUL_API_KEY = originalApiKey;
  }
});

describe('cliDistinctId', () => {
  test('uses the explicit user ID when present', () => {
    process.env.GRASPFUL_USER_ID = 'user-123';
    process.env.GRASPFUL_API_KEY = 'gsk_secret';

    expect(cliDistinctId()).toBe('user-123');
  });

  test('hashes API keys instead of sending the secret', () => {
    delete process.env.GRASPFUL_USER_ID;
    process.env.GRASPFUL_API_KEY = 'gsk_secret';

    const digest = createHash('sha256').update('gsk_secret').digest('hex');
    const result = cliDistinctId();

    expect(result).toBe(`credential:${digest}`);
    expect(result).not.toContain('gsk_secret');
  });

  test('uses a stable identifier for the current anonymous process', () => {
    delete process.env.GRASPFUL_USER_ID;
    delete process.env.GRASPFUL_API_KEY;

    const first = cliDistinctId();

    expect(first).toStartWith('anonymous-cli:');
    expect(cliDistinctId()).toBe(first);
  });
});
