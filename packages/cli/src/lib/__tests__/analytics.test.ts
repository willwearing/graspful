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

  test('uses stored credentials when the API key is not in the environment', () => {
    delete process.env.GRASPFUL_USER_ID;
    delete process.env.GRASPFUL_API_KEY;

    const digest = createHash('sha256').update('gsk_stored').digest('hex');
    expect(cliDistinctId({ apiKey: 'gsk_stored' })).toBe(
      `credential:${digest}`,
    );
  });

  test('uses the stored user ID before hashing stored credentials', () => {
    delete process.env.GRASPFUL_USER_ID;
    delete process.env.GRASPFUL_API_KEY;

    expect(cliDistinctId({ apiKey: 'gsk_stored', userId: 'user-stored' })).toBe(
      'user-stored',
    );
  });

  test('uses a stable identifier for the current anonymous process', () => {
    delete process.env.GRASPFUL_USER_ID;
    delete process.env.GRASPFUL_API_KEY;

    const first = cliDistinctId({}, 'anonymous-cli:installation-123');

    expect(first).toStartWith('anonymous-cli:');
    expect(cliDistinctId({}, 'anonymous-cli:installation-123')).toBe(first);
  });
});
