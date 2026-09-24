import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';


describe('graspful login', () => {
  let originalFetch: typeof globalThis.fetch;
  let directory: string;
  let previousConfigDir: string | undefined;
  let exitSpy: ReturnType<typeof spyOn>;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let originalConsoleError: typeof console.error;
  const errorCalls: unknown[][] = [];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('Unexpected network request'); }) as typeof fetch;
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graspful-auth-test-'));
    previousConfigDir = process.env.GRASPFUL_CONFIG_DIR;
    process.env.GRASPFUL_CONFIG_DIR = directory;
    exitSpy = spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    originalConsoleError = console.error;
    errorCalls.length = 0;
    console.error = (...args: unknown[]) => { errorCalls.push(args); };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (previousConfigDir === undefined) delete process.env.GRASPFUL_CONFIG_DIR;
    else process.env.GRASPFUL_CONFIG_DIR = previousConfigDir;
    fs.rmSync(directory, { recursive: true, force: true });
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    console.error = originalConsoleError;
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

    const savedContent = JSON.parse(fs.readFileSync(path.join(directory, 'credentials.json'), 'utf-8'));
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

    const savedContent = JSON.parse(fs.readFileSync(path.join(directory, 'credentials.json'), 'utf-8'));
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

    const savedContent = JSON.parse(fs.readFileSync(path.join(directory, 'credentials.json'), 'utf-8'));
    expect(savedContent.apiKey).toBe('gsk_browser_flow_key');
    expect(savedContent.userId).toBe('user-123');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });
});
