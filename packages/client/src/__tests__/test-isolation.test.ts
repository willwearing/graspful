import '../../test-support/preload';
import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('preload blocks inherited production telemetry and credentials before application imports', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'graspful-preload-proof-'));
  const preload = resolve(import.meta.dir, '../../test-support/preload.ts');
  const analytics = resolve(import.meta.dir, '../../../cli/src/lib/analytics.ts');
  const mcp = resolve(import.meta.dir, '../../../mcp/src/index.ts');
  const fixture = join(directory, 'isolation.test.ts');
  writeFileSync(fixture, `
    import { expect, mock, test } from 'bun:test';
    const telemetry = mock(() => { throw new Error('Telemetry must not initialize during tests'); });
    mock.module('posthog-node', () => ({ PostHog: telemetry }));
    test('application imports are isolated', async () => {
      expect(process.env.NODE_ENV).toBe('production');
      expect(process.env.GRASPFUL_TELEMETRY_DISABLED).toBe('1');
      expect(process.env.GRASPFUL_API_KEY).toBeUndefined();
      expect(process.env.GRASPFUL_CONFIG_DIR).not.toBe('/must-not-be-used');
      const { cliCapture } = await import(${JSON.stringify(analytics)});
      const { handleToolCall } = await import(${JSON.stringify(mcp)});
      cliCapture('isolated test event');
      await handleToolCall('graspful_scaffold_course', { topic: 'Isolated fixture' });
      expect(telemetry).not.toHaveBeenCalled();
      await expect(fetch('https://must-not-be-contacted.invalid')).rejects.toThrow('Test blocked');
    });
  `);
  try {
    const env = { ...process.env };
    delete env.GRASPFUL_TELEMETRY_DISABLED;
    const child = Bun.spawn(['bun', 'test', '--preload', preload, fixture], {
      cwd: directory,
      env: { ...env, NODE_ENV: 'production', GRASPFUL_API_KEY: 'gsk_inherited_fixture', GRASPFUL_CONFIG_DIR: '/must-not-be-used', POSTHOG_API_KEY: 'inherited-posthog-fixture' },
      stdout: 'pipe', stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(`${stdout}\n${stderr}`).toContain('1 pass');
    expect(code).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
