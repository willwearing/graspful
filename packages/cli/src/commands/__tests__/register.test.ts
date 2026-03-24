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

  it('saves API key credentials on successful registration', async () => {
    const mockResponse = {
      userId: 'user-123',
      orgSlug: 'test-org',
      apiKey: 'gsk_test_key_abc123',
    };

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
    ) as any;

    // Import fresh to avoid module caching issues
    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'register',
      '--email', 'test@example.com',
      '--password', 'securepassword',
      '--api-url', 'http://localhost:3000',
    ]);

    // Verify fetch was called with correct endpoint and body
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe('http://localhost:3000/auth/register');
    const fetchBody = JSON.parse(fetchCall[1].body);
    expect(fetchBody.email).toBe('test@example.com');
    expect(fetchBody.password).toBe('securepassword');

    // Verify credentials were saved
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    const savedContent = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
    expect(savedContent.apiKey).toBe('gsk_test_key_abc123');
    expect(savedContent.baseUrl).toBe('http://localhost:3000');
  });

  it('prints success message with org slug', async () => {
    const mockResponse = {
      userId: 'user-456',
      orgSlug: 'my-org',
      apiKey: 'gsk_another_key',
    };

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
    ) as any;

    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    await program.parseAsync([
      'node', 'graspful',
      'register',
      '--email', 'user@example.com',
      '--password', 'pw123',
      '--api-url', 'http://localhost:3000',
    ]);

    // Verify success output contains org slug
    const logOutput = consoleLogSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(logOutput).toContain('my-org');
    expect(logOutput).toContain('gsk_another_key');
  });

  it('exits with error on HTTP failure', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Email already registered' }), { status: 409 }))
    ) as any;

    const { registerRegisterCommand } = await import('../register');
    const { Command } = await import('commander');

    const program = new Command();
    registerRegisterCommand(program);

    try {
      await program.parseAsync([
        'node', 'graspful',
        'register',
        '--email', 'dupe@example.com',
        '--password', 'pw',
        '--api-url', 'http://localhost:3000',
      ]);
    } catch (e: any) {
      expect(e.message).toBe('process.exit');
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(errorOutput).toContain('Email already registered');
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
    expect(errorOutput).toContain('ECONNREFUSED');
  });
});
