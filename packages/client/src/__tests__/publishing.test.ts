import '../../test-support/preload';
import { expect, test } from 'bun:test';
const { resolveWorkspaceDependencies } = require('../../scripts/resolve-workspace-dependencies.cjs');

test('published packages point to each dependency own version without changing sources', () => {
  const shared = { name: '@graspful/shared', version: '0.2.5' };
  const client = { name: '@graspful/client', version: '0.1.0', dependencies: { '@graspful/shared': 'workspace:*' } };
  const cli = { name: '@graspful/cli', version: '0.2.9', dependencies: { '@graspful/shared': 'workspace:*', '@graspful/client': 'workspace:*', commander: '^13.0.0' } };
  const resolved = resolveWorkspaceDependencies([shared, client, cli]);
  expect(resolved[1].dependencies).toEqual({ '@graspful/shared': '^0.2.5' });
  expect(resolved[2].dependencies).toEqual({ '@graspful/shared': '^0.2.5', '@graspful/client': '^0.1.0', commander: '^13.0.0' });
  expect(cli.dependencies['@graspful/client']).toBe('workspace:*');
});

test('fails before publishing unresolved workspace dependencies', () => {
  expect(() => resolveWorkspaceDependencies([{ name: 'cli', version: '1.0.0', dependencies: { unknown: 'workspace:*' } }])).toThrow('Unknown workspace dependency');
});

test('client declares the repository required by GitHub trusted publishing', () => {
  const manifest = require('../../package.json');
  expect(manifest.repository).toEqual({
    type: 'git',
    url: 'git+https://github.com/willwearing/graspful.git',
    directory: 'packages/client',
  });
});
