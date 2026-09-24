import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../..');

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', '.next', '.turbo'].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

describe('repository setup examples', () => {
  it('documents every literal environment setting read by app, package, and backend code', () => {
    const example = readFileSync(join(root, '.env.example'), 'utf8');
    const documented = new Set([...example.matchAll(/^\s*(?:#\s*)?([A-Z][A-Z0-9_]+)=/gm)].map((match) => match[1]));
    const missing = new Set<string>();
    for (const directory of ['apps', 'backend', 'packages']) {
      for (const path of filesBelow(join(root, directory))) {
        if (!/\.(?:[cm]?[jt]sx?|prisma)$/.test(path) || /\.(test|spec)\./.test(path)) continue;
        const text = readFileSync(path, 'utf8');
        const patterns = [
          /\b(?:process\.env|env|__ENV)\.([A-Z][A-Z0-9_]+)/g,
          /\bconfig\.(?:get|getOrThrow)(?:<[^>]+>)?\(['"]([A-Z_]+)['"]/g,
          /\benv\(['"]([A-Z_]+)['"]/g,
        ];
        for (const pattern of patterns) {
          for (const match of text.matchAll(pattern)) {
            if (!documented.has(match[1])) missing.add(match[1]);
          }
        }
      }
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('keeps local links in maintained documentation valid after file moves', () => {
    const paths = ['README.md', 'CLAUDE.md', 'AGENTS.md'].map((path) => join(root, path));
    paths.push(...filesBelow(join(root, 'docs')).filter((path) => path.endsWith('.md')));
    const broken: string[] = [];
    for (const path of paths) {
      for (const match of readFileSync(path, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
        const target = match[1].split('#')[0];
        if (!target || /^(?:\w+:|\/)/.test(target)) continue;
        if (!existsSync(resolve(dirname(path), target))) broken.push(`${path}: ${target}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
