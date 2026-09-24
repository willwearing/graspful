import '../../../../client/test-support/preload';
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { registerInitCommand } from '../init';
import { setOutputFormat, type OutputFormat } from '../../lib/output';
import { saveApiKeyCredentials } from '@graspful/client';
import { handleToolCall } from '../../../../mcp/src/index';

describe('init editor configuration', () => {
  let directory: string;
  let cwdSpy: ReturnType<typeof spyOn>;
  let homedirSpy: ReturnType<typeof spyOn>;
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let previousConfigDir: string | undefined;
  let previousApiUrl: string | undefined;
  let previousFetch: typeof fetch;
  let previousKey: string | undefined;
  let previousUserId: string | undefined;
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graspful-init-test-'));
    const taskHomeDir = path.join(directory, 'test-user');
    fs.mkdirSync(taskHomeDir);
    cwdSpy = spyOn(process, 'cwd').mockReturnValue(directory);
    homedirSpy = spyOn(os, 'homedir').mockReturnValue(taskHomeDir);
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    previousConfigDir = process.env.GRASPFUL_CONFIG_DIR;
    previousApiUrl = process.env.GRASPFUL_API_URL;
    previousFetch = globalThis.fetch;
    process.env.GRASPFUL_CONFIG_DIR = path.join(directory, 'credentials');
    delete process.env.GRASPFUL_API_URL;
    globalThis.fetch = (async () => { throw new Error('Unexpected network request'); }) as typeof fetch;
    previousKey = process.env.GRASPFUL_API_KEY;
    previousUserId = process.env.GRASPFUL_USER_ID;
    previousExitCode = process.exitCode;
    process.env.GRASPFUL_API_KEY = 'gsk_init_test';
    process.env.GRASPFUL_USER_ID = 'init-test-user';
    process.exitCode = 0;
    setOutputFormat('human');
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
    if (previousConfigDir === undefined) delete process.env.GRASPFUL_CONFIG_DIR;
    else process.env.GRASPFUL_CONFIG_DIR = previousConfigDir;
    if (previousApiUrl === undefined) delete process.env.GRASPFUL_API_URL;
    else process.env.GRASPFUL_API_URL = previousApiUrl;
    setOutputFormat('human');
    cwdSpy.mockRestore();
    homedirSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    if (previousKey === undefined) delete process.env.GRASPFUL_API_KEY;
    else process.env.GRASPFUL_API_KEY = previousKey;
    if (previousUserId === undefined) delete process.env.GRASPFUL_USER_ID;
    else process.env.GRASPFUL_USER_ID = previousUserId;
    process.exitCode = previousExitCode ?? 0;
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function config(editor: string, contents?: string) {
    const configDir = path.join(directory, editor);
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'mcp.json');
    if (contents !== undefined) fs.writeFileSync(configPath, contents);
    return configPath;
  }

  async function init(...args: string[]) {
    const program = new Command();
    registerInitCommand(program);
    await program.parseAsync(['bun', 'graspful', 'init', ...args]);
  }

  test('VS Code uses servers and preserves existing servers and input definitions', async () => {
    const inputs = [{ id: 'token', type: 'promptString', description: 'Existing token' }];
    const existingServer = { type: 'stdio', command: 'existing-mcp' };
    const configPath = config('.vscode', JSON.stringify({ servers: { existing: existingServer }, inputs }));

    await init();

    const written = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(written.servers.graspful).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@graspful/mcp'],
      env: { GRASPFUL_CONFIG_DIR: path.join(directory, 'credentials') },
    });
    expect(written.servers.existing).toEqual(existingServer);
    expect(written.inputs).toEqual(inputs);
    expect(written.mcpServers).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  test('Cursor retains its mcpServers configuration format', async () => {
    const configPath = config('.cursor', JSON.stringify({ mcpServers: { existing: { command: 'existing-mcp' } } }));

    await init();

    const written = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(written.mcpServers.graspful.command).toBe('npx');
    expect(written.mcpServers.existing).toEqual({ command: 'existing-mcp' });
    expect(written.servers).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  test('repairs the Graspful entry written under the old incorrect VS Code key', async () => {
    const configPath = config('.vscode', JSON.stringify({
      mcpServers: { graspful: { command: 'npx', args: ['@graspful/mcp'] } },
    }));

    await init();

    const written = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(written.mcpServers).toBeUndefined();
    expect(written.servers.graspful.type).toBe('stdio');
    expect(written.servers.graspful.env).not.toHaveProperty('GRASPFUL_API_KEY');
    expect(process.exitCode).toBe(0);
  });

  test('Windsurf Cascade uses its documented global configuration path', async () => {
    const configDir = path.join(os.homedir(), '.codeium', 'windsurf');
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'mcp_config.json');
    fs.writeFileSync(configPath, JSON.stringify({ mcpServers: { existing: { command: 'existing-mcp' } } }));

    await init();

    const written = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(written.mcpServers.graspful.command).toBe('npx');
    expect(written.mcpServers.existing).toEqual({ command: 'existing-mcp' });
    expect(fs.existsSync(path.join(os.homedir(), '.windsurf', 'mcp.json'))).toBe(false);
    expect(process.exitCode).toBe(0);
  });

  test.each([
    '{ invalid json',
    '[]',
    'null',
    '{"servers": []}',
    '{"servers": "existing"}',
  ])('preserves unusable existing configuration and reports failure (%s)', async (contents) => {
    const configPath = config('.vscode', contents);

    await init();

    expect(fs.readFileSync(configPath, 'utf8')).toBe(contents);
    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls.flat().join('\n')).toContain('The existing file was preserved.');
    expect(logSpy.mock.calls.flat().join('\n')).not.toContain('Ready.');
    expect(logSpy.mock.calls.flat().join('\n')).not.toContain('MCP configured for VS Code');
  });

  test('continues configuring other editors while reporting any failure', async () => {
    const cursorPath = config('.cursor');
    config('.vscode', '{ invalid json');

    await init();

    expect(JSON.parse(fs.readFileSync(cursorPath, 'utf8')).mcpServers.graspful).toBeDefined();
    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls.flat().join('\n')).toContain('MCP configuration failed for VS Code');
  });

  test('--no-mcp preserves all editor configuration', async () => {
    const configPath = config('.vscode', '{ unchanged config');

    await init('--no-mcp');

    expect(fs.readFileSync(configPath, 'utf8')).toBe('{ unchanged config');
    expect(process.exitCode).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('generated editor configuration uses saved credentials through later key rotation', async () => {
    const configPath = config('.cursor');
    await init();
    const server = JSON.parse(fs.readFileSync(configPath, 'utf8')).mcpServers.graspful;
    expect(JSON.stringify(server)).not.toContain('gsk_init_test');
    expect(server.env).not.toHaveProperty('GRASPFUL_API_KEY');
    expect(server.env).not.toHaveProperty('GRASPFUL_USER_ID');
    delete process.env.GRASPFUL_API_KEY;
    delete process.env.GRASPFUL_USER_ID;
    const keys: string[] = [];
    globalThis.fetch = (async (_url, options) => {
      keys.push((options?.headers as Record<string, string>).Authorization);
      return Response.json([]);
    }) as typeof fetch;
    const initial = await handleToolCall('graspful_list_courses', { org: 'example' });
    expect(initial.isError).toBeUndefined();
    saveApiKeyCredentials('gsk_rotated_after_init', 'https://rotated.test', 'rotated-user');
    const rotated = await handleToolCall('graspful_list_courses', { org: 'example' });
    expect(rotated.isError).toBeUndefined();
    expect(keys).toEqual(['Bearer gsk_init_test', 'Bearer gsk_rotated_after_init']);
  });

  test('manual configuration output omits authentication secrets', async () => {
    await init();
    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).toContain('mcpServers');
    expect(printed).not.toContain('gsk_init_test');
    expect(printed).not.toContain('GRASPFUL_API_KEY');
    expect(printed).not.toContain('init-test-user');
  });

  test.each(['human', 'json'])('signup masks the API key in %s output and configuration', async (format) => {
    delete process.env.GRASPFUL_API_KEY;
    delete process.env.GRASPFUL_USER_ID;
    setOutputFormat(format as OutputFormat);
    const configPath = config('.vscode');
    globalThis.fetch = (async (url) => {
      if (String(url).endsWith('/auth/cli/sessions')) {
        return Response.json({ token: 'temporary-init-session', expiresAt: new Date(Date.now() + 60_000).toISOString(), pollIntervalMs: 1 });
      }
      if (String(url).endsWith('/auth/cli/sessions/exchange')) {
        return Response.json({ status: 'complete', userId: 'init-new-user', orgSlug: 'init-org', apiKey: 'gsk_signup_secret_fixture' });
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;
    await init('--no-browser', '--api-url', 'https://signup.test');
    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).not.toContain('gsk_signup_secret_fixture');
    expect(printed).toContain('gsk_...ture');
    const contents = fs.readFileSync(configPath, 'utf8');
    expect(contents).not.toContain('gsk_signup_secret_fixture');
    const credentials = JSON.parse(fs.readFileSync(path.join(directory, 'credentials', 'credentials.json'), 'utf8'));
    expect(credentials.apiKey).toBe('gsk_signup_secret_fixture');
  });

  test('keeps saved API URL dynamic and passes explicit nonsecret URL overrides', async () => {
    delete process.env.GRASPFUL_API_KEY;
    saveApiKeyCredentials('gsk_stored_fixture', 'https://saved.test', 'saved-user');
    setOutputFormat('json');
    const configPath = config('.cursor');
    await init();
    expect(logSpy.mock.calls.flat().join('\n')).toContain('https://saved.test');
    const defaultConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')).mcpServers.graspful;
    expect(defaultConfig.env).not.toHaveProperty('GRASPFUL_API_URL');
    await init('--api-url', 'https://explicit.test');
    const overrideConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')).mcpServers.graspful;
    expect(overrideConfig.env.GRASPFUL_API_URL).toBe('https://explicit.test');
  });

});
