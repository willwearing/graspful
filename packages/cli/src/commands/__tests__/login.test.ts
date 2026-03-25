import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CREDENTIALS_PATH = path.join(os.homedir(), '.graspful', 'credentials.json');

describe('graspful login', () => {
  let writeFileSyncSpy: ReturnType<typeof spyOn>;
  let mkdirSyncSpy: ReturnType<typeof spyOn>;
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    writeFileSyncSpy = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    mkdirSyncSpy = spyOn(fs, 'mkdirSync').mockImplementation(() => '' as any);
    existsSyncSpy = spyOn(fs, 'existsSync').mockReturnValue(false);
    exitSpy = spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
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

  it('does not accept --email or --password flags', async () => {
    const { registerLoginCommand } = await import('../login');
    const { Command } = await import('commander');

    const program = new Command();
    program.exitOverride(); // throw instead of process.exit on unknown options
    registerLoginCommand(program);

    let threw = false;
    try {
      await program.parseAsync([
        'node', 'graspful',
        'login',
        '--email', 'test@example.com',
        '--password', 'mypassword',
        '--api-url', 'http://localhost:3000',
      ]);
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
  });
});
