import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test the register command by invoking the action logic directly,
// mocking fetch and filesystem writes.

const CREDENTIALS_PATH = path.join(os.homedir(), '.graspful', 'credentials.json');

describe('graspful register', () => {
  let originalFetch: typeof globalThis.fetch;
  let writeFileSyncSpy: ReturnType<typeof spyOn>;
  let mkdirSyncSpy: ReturnType<typeof spyOn>;
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    writeFileSyncSpy = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    mkdirSyncSpy = spyOn(fs, 'mkdirSync').mockImplementation(() => '' as any);
    existsSyncSpy = spyOn(fs, 'existsSync').mockReturnValue(false);
    exitSpy = spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    writeFileSyncSpy.mockRestore();
    mkdirSyncSpy.mockRestore();
    existsSyncSpy.mockRestore();
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('saves API key credentials after browser sign-up completes', async () => {
    globalThis.fetch = mock((url: string) => {
      if (url.endsWith('/api/v1/auth/cli/sessions')) {
        return Promise.resolve(new Response(JSON.stringify({
          token: 'cli-token-123',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          pollIntervalMs: 1,
        }), { status: 201 }));
      }

      if (url.endsWith('/api/v1/auth/cli/sessions/exchange')) {
        return Promise.resolve(new Response(JSON.stringify({
          status: 'complete',
          userId: 'user-123',
          orgSlug: 'test-org',
          apiKey: 'gsk_test_key_abc123',
        }), { status: 200 }));
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as any;

    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'register',
      '--email', 'test@example.com',
      '--no-browser',
      '--api-url', 'http://localhost:3000',
    ]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe('http://localhost:3000/api/v1/auth/cli/sessions');
    const fetchBody = JSON.parse(fetchCall[1].body);
    expect(fetchBody.mode).toBe('sign-up');

    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    const savedContent = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
    expect(savedContent.apiKey).toBe('gsk_test_key_abc123');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });

  it('prints success message with org slug', async () => {
    globalThis.fetch = mock((url: string) => {
      if (url.endsWith('/api/v1/auth/cli/sessions')) {
        return Promise.resolve(new Response(JSON.stringify({
          token: 'cli-token-456',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          pollIntervalMs: 1,
        }), { status: 201 }));
      }

      if (url.endsWith('/api/v1/auth/cli/sessions/exchange')) {
        return Promise.resolve(new Response(JSON.stringify({
          status: 'complete',
          userId: 'user-456',
          orgSlug: 'my-org',
          apiKey: 'gsk_another_key',
        }), { status: 200 }));
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as any;

    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'register',
      '--email', 'user@example.com',
      '--no-browser',
      '--api-url', 'http://localhost:3000',
    ]);

    const logOutput = consoleLogSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(logOutput).toContain('my-org');
    expect(logOutput).toContain('gsk_another_key');
  });

  it('exits with error when starting browser auth fails', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Sign-up disabled' }), { status: 410 }))
    ) as any;

    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    try {
      await program.parseAsync([
        'node', 'graspful',
        'register',
        '--no-browser',
        '--api-url', 'http://localhost:3000',
      ]);
    } catch (e: any) {
      expect(e.message).toBe('process.exit');
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(errorOutput).toContain('Sign-up disabled');
  });

  it('exits with error on network failure', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('ECONNREFUSED'))
    ) as any;

    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    try {
      await program.parseAsync([
        'node', 'graspful',
        'register',
        '--email', 'user@example.com',
        '--password', 'pw',
        '--api-url', 'http://localhost:3000',
      ]);
    } catch (e: any) {
      expect(e.message).toBe('process.exit');
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(errorOutput).toContain('Could not reach the API');
  });
});
