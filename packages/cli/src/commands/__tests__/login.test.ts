import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CREDENTIALS_PATH = path.join(os.homedir(), '.graspful', 'credentials.json');

describe('graspful login', () => {
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

  it('saves API key credentials when token starts with gsk_', async () => {
    const { registerLoginCommand } = await import('../login');
    const { Command } = await import('commander');

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'login',
      '--token', 'gsk_my_api_key',
      '--api-url', 'http://localhost:3000',
    ]);

    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    const savedContent = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
    expect(savedContent.apiKey).toBe('gsk_my_api_key');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });

  it('saves JWT credentials when token does not start with gsk_', async () => {
    const { registerLoginCommand } = await import('../login');
    const { Command } = await import('commander');

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'login',
      '--token', 'eyJhbGciOiJIUzI1NiJ9.test',
      '--api-url', 'http://localhost:3000',
    ]);

    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    const savedContent = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
    expect(savedContent.jwt).toBe('eyJhbGciOiJIUzI1NiJ9.test');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });

  it('runs the browser sign-in flow when no token is provided', async () => {
    const { registerLoginCommand } = await import('../login');
    const { Command } = await import('commander');

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
          apiKey: 'gsk_browser_flow_key',
        }), { status: 200 }));
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as any;

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'login',
      '--email', 'test@example.com',
      '--no-browser',
      '--api-url', 'http://localhost:3000',
    ]);

    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    const savedContent = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
    expect(savedContent.apiKey).toBe('gsk_browser_flow_key');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });
});
