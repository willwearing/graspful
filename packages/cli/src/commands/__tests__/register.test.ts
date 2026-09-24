import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { setOutputFormat, type OutputFormat } from '../../lib/output';

// We test the register command by invoking the action logic directly,
// using mocked HTTP and an isolated credential directory.


describe('graspful register', () => {
  let originalFetch: typeof globalThis.fetch;
  let directory: string;
  let previousConfigDir: string | undefined;
  let exitSpy: ReturnType<typeof spyOn>;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let originalConsoleError: typeof console.error;
  const errorCalls: unknown[][] = [];

  beforeEach(() => {
    setOutputFormat('human');
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
    setOutputFormat('human');
    globalThis.fetch = originalFetch;
    if (previousConfigDir === undefined) delete process.env.GRASPFUL_CONFIG_DIR;
    else process.env.GRASPFUL_CONFIG_DIR = previousConfigDir;
    fs.rmSync(directory, { recursive: true, force: true });
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    console.error = originalConsoleError;
  });

  it.each(['human', 'json'])('saves credentials and masks key in %s output', async (format) => {
    setOutputFormat(format as OutputFormat);
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

    const savedContent = JSON.parse(fs.readFileSync(path.join(directory, 'credentials.json'), 'utf-8'));
    expect(savedContent.apiKey).toBe('gsk_test_key_abc123');
    const printed = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(printed).not.toContain('gsk_test_key_abc123');
    expect(printed).toContain('gsk_...c123');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });

  it.each([undefined, 'academy.example.com'])('only prints an existing brand domain (%s)', async (brandDomain) => {
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
          ...(brandDomain ? { brandDomain } : {}),
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
    expect(logOutput).not.toContain('gsk_another_key');
    expect(logOutput).toContain('gsk_..._key');
    expect(logOutput).not.toContain('my-org.graspful.ai');
    if (brandDomain) {
      expect(logOutput).toContain(`Brand: ${brandDomain}`);
    } else {
      expect(logOutput).not.toContain('Brand:');
    }
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
    const errorOutput = errorCalls.map((c) => c[0]).join('\n');
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
    const errorOutput = errorCalls.map((c) => c[0]).join('\n');
    expect(errorOutput).toContain('Could not reach the API');
  });
});
