import '../../../../client/test-support/preload';
import { expect, test, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'graspful-cli-cleanup-')); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });
const entry = resolve(import.meta.dir, '../../index.ts');
function run(args: string[], keepStdinOpen = false, input?: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn('bun', [entry, ...args], { env: { ...process.env, NODE_ENV: 'test', GRASPFUL_CONFIG_DIR: directory, GRASPFUL_API_URL: 'http://127.0.0.1:1', GRASPFUL_API_KEY: '' }, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('CLI did not exit with open non-TTY stdin')); }, 1500);
    child.on('error', reject);
    child.on('close', (code) => { clearTimeout(timer); resolveResult({ code, output }); });
    if (!keepStdinOpen) child.stdin.end(input);
  });
}
test('unexpected write failures return a nonzero exit code', async () => {
  const result = await run(['create', 'course', '--topic', 'Test', '-o', join(directory, 'missing-directory', 'course.yaml')]);
  expect(result.code).toBe(1);
  expect(result.output).toContain('ENOENT');
});
test.each(['oops', '12oops', '-1', '0'])('rejects invalid hours %s', async (hours) => {
  const result = await run(['create', 'course', '--topic', 'Test', '--hours', hours]);
  expect(result.code).toBe(1);
  expect(result.output).toContain('hours');
});
test('noninteractive login without explicit credentials exits promptly', async () => {
  const result = await run(['login'], true);
  expect(result.code).toBe(1);
  expect(result.output).toContain('--token');
});


test('explicit token stdin login saves only into the isolated directory', async () => {
  const result = await run(['login', '--token-stdin'], false, 'gsk_piped_fixture\n');
  expect(result.code).toBe(0);
  expect(JSON.parse(readFileSync(join(directory, 'credentials.json'), 'utf-8')).apiKey).toBe('gsk_piped_fixture');
  expect(result.output).not.toContain('gsk_piped_fixture');
});

test('empty token stdin input fails without starting browser auth', async () => {
  const result = await run(['login', '--token-stdin']);
  expect(result.code).toBe(1);
  expect(result.output).toContain('No token received');
});

test('version output comes from the package manifest', async () => {
  const result = await run(['--version']);
  expect(result.code).toBe(0);
  expect(result.output.trim()).toBe(require('../../../package.json').version);
});
