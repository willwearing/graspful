import '../../test-support/preload';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffoldBrandObject } from '@graspful/shared';
import {
  ApiError, GraspfulApi, brandYamlToCreateDto, credentialsPath, dumpYaml,
  hashCredential, maskApiKey, parseYaml, readYamlFile, requireAuth,
  resolveCredentials, saveApiKeyCredentials, saveCredentials, telemetryConfig,
} from '../index';

const envKeys = ['GRASPFUL_CONFIG_DIR', 'GRASPFUL_API_KEY', 'GRASPFUL_API_URL', 'GRASPFUL_USER_ID',
  'GRASPFUL_TELEMETRY_DISABLED', 'NODE_ENV', 'POSTHOG_API_KEY', 'POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST'] as const;
let originalEnv: Array<string | undefined>;
let directory: string;
let previousFetch: typeof fetch;
beforeEach(() => {
  originalEnv = envKeys.map((key) => process.env[key]);
  for (const key of envKeys) delete process.env[key];
  directory = mkdtempSync(join(tmpdir(), 'graspful-client-test-'));
  process.env.GRASPFUL_CONFIG_DIR = directory;
  previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('Unexpected network request'); }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = previousFetch;
  envKeys.forEach((key, index) => {
    if (originalEnv[index] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[index];
  });
  rmSync(directory, { recursive: true, force: true });
});

describe('credentials', () => {
  test('reloads saved credentials, gives env settings priority, and accepts a stored JWT', () => {
    expect(resolveCredentials()).toEqual({ baseUrl: 'https://api.graspful.ai' });
    expect(requireAuth).toThrow('Not authenticated');
    saveApiKeyCredentials('gsk_saved', 'https://stored.test', 'user-saved');
    expect(requireAuth()).toMatchObject({ apiKey: 'gsk_saved', baseUrl: 'https://stored.test', userId: 'user-saved' });
    process.env.GRASPFUL_API_URL = 'https://override.test';
    expect(resolveCredentials().baseUrl).toBe('https://override.test');
    process.env.GRASPFUL_API_KEY = 'gsk_env';
    process.env.GRASPFUL_USER_ID = 'user-env';
    expect(resolveCredentials()).toEqual({ apiKey: 'gsk_env', userId: 'user-env', baseUrl: 'https://override.test' });
    delete process.env.GRASPFUL_API_KEY;
    delete process.env.GRASPFUL_USER_ID;
    saveCredentials('jwt-saved', 'https://jwt.test');
    expect(resolveCredentials()).toMatchObject({ jwt: 'jwt-saved', baseUrl: 'https://override.test' });
    expect(resolveCredentials().apiKey).toBeUndefined();
  });
  test.each(['bad json', 'null', '[]', '{"apiKey":42,"jwt":false}', '{"apiKey":" "}'])('ignores malformed stored credentials %s', (content) => {
    writeFileSync(credentialsPath(), content);
    expect(requireAuth).toThrow('Not authenticated');
  });
  test('writes private credentials even when replacing a permissive existing file', () => {
    writeFileSync(credentialsPath(), '{}', { mode: 0o644 });
    saveApiKeyCredentials('gsk_private');
    expect(statSync(credentialsPath()).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(credentialsPath(), 'utf-8')).apiKey).toBe('gsk_private');
  });
  test('masking and analytics hashing do not expose a credential', () => {
    expect(maskApiKey('gsk_sensitive_value')).toBe('gsk_...alue');
    expect(maskApiKey('short')).toBe('****');
    expect(hashCredential('gsk_sensitive_value')).toMatch(/^credential:[a-f0-9]{64}$/);
    expect(hashCredential('gsk_sensitive_value')).not.toContain('gsk_sensitive_value');
  });
});

describe('HTTP transport', () => {
  test('uses the key before JWT and encodes endpoint path segments', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ courseId: 'id', published: true });
    }) as typeof fetch;
    const api = new GraspfulApi({ apiKey: 'key', jwt: 'jwt', baseUrl: 'https://api.test///' });
    await api.importCourse('a/b?#', { yaml: 'course: {}', replace: true, archiveMissing: true });
    await api.publish('a/b?#', 'c/d?#');
    await api.listCourses('a/b?#');
    expect(calls[0].url).toBe('https://api.test/api/v1/orgs/a%2Fb%3F%23/courses/import');
    expect(calls[0].init?.headers).toMatchObject({ Authorization: 'Bearer key' });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ yaml: 'course: {}', publish: false, replace: true, archiveMissing: true });
    expect(calls[1].url).toEndWith('/courses/c%2Fd%3F%23/publish');
    expect(calls[2].init?.body).toBeUndefined();
  });
  test('supports JWT, PATCH and empty responses', async () => {
    globalThis.fetch = (async (_url, init) => {
      expect(init?.method).toBe('PATCH');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer jwt' });
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    await expect(new GraspfulApi({ jwt: 'jwt', baseUrl: 'https://api.test' }).patch('/test', {})).resolves.toBeUndefined();
  });
  test('preserves HTTP status and response body in errors', async () => {
    globalThis.fetch = (async () => new Response('Unavailable', { status: 503 })) as typeof fetch;
    try {
      await new GraspfulApi({ baseUrl: 'https://api.test' }).get('/test');
      throw new Error('Expected API failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 503, responseBody: 'Unavailable', message: 'API error 503: Unavailable' });
    }
  });
  test('keeps academy import and partial publication results after a network failure', async () => {
    const requests: string[] = [];
    const responses = [
      { academyId: 'academy', academySlug: 'academy', partCount: 1, courseCount: 3, courseResults: [{ courseId: 'a' }, { courseId: 'b' }, { courseId: 'c' }], warnings: [] },
      { published: false }, new Error('Connection closed'), { published: true },
    ];
    globalThis.fetch = (async (url, init) => {
      requests.push(String(url));
      if (requests.length === 1) expect(JSON.parse(String(init?.body))).toMatchObject({ replace: true, archiveMissing: true });
      const result = responses.shift();
      if (result instanceof Error) throw result;
      return Response.json(result);
    }) as typeof fetch;
    const result = await new GraspfulApi({ baseUrl: 'https://api.test' }).importAcademy('org', {
      manifestYaml: 'academy: {}', courseYamls: {}, publish: true, replace: true, archiveMissing: true,
    });
    expect(result.academyId).toBe('academy');
    expect(result.publishedCourseIds).toEqual(['c']);
    expect(result.publishFailures).toHaveLength(2);
    expect(result.publishFailures[1]).toBe('b: Connection closed');
    expect(result.status).toBe('partially_published');
    expect(requests).toHaveLength(4);
  });
});

describe('shared YAML and brand contract', () => {
  test('validates brand YAML and applies one logo default and schema defaults', () => {
    const source = scaffoldBrandObject('tech', { orgSlug: 'example' });
    delete source.brand.logoUrl;
    const dto = brandYamlToCreateDto(source);
    expect(dto.slug).toBe(source.brand.id);
    expect(dto.logoUrl).toBe('/icon.svg');
    expect(dto.landing).toEqual(source.landing);
    expect(() => brandYamlToCreateDto({ brand: { id: 'partial' } })).toThrow();
  });
  test('returns the backend nested brand and domain result', async () => {
    const response = { brand: { slug: 'example', domain: 'example.test' }, domain: { verified: false, dnsInstructions: { type: 'CNAME', name: '@', value: 'cname.test' } } };
    globalThis.fetch = (async () => Response.json(response)) as typeof fetch;
    expect(await new GraspfulApi({ baseUrl: 'https://api.test' }).importBrand(scaffoldBrandObject('tech', { orgSlug: 'example' }))).toEqual(response);
  });
  test('reads YAML and preserves strings through a dump/load round trip', () => {
    const value = { text: '2026-09-24', enabled: false, count: 3, lines: 'a\nb' };
    const content = dumpYaml(value);
    expect(parseYaml(content)).toEqual(value);
    const filename = join(directory, 'data.yaml');
    writeFileSync(filename, content);
    expect(readYamlFile(filename)).toEqual({ content, raw: value });
    expect(() => readYamlFile(join(directory, 'absent'))).toThrow('File not found');
    writeFileSync(filename, 'bad: [');
    expect(() => readYamlFile(filename)).toThrow('YAML parse error');
  });
});

test('telemetry opts out in tests and via env and resolves configured hosts', () => {
  process.env.NODE_ENV = 'test';
  expect(telemetryConfig().key).toBeNull();
  delete process.env.NODE_ENV;
  process.env.GRASPFUL_TELEMETRY_DISABLED = '1';
  process.env.POSTHOG_API_KEY = 'test-key';
  expect(telemetryConfig().key).toBeNull();
  delete process.env.GRASPFUL_TELEMETRY_DISABLED;
  process.env.POSTHOG_HOST = 'https://telemetry.test';
  expect(telemetryConfig()).toEqual({ key: 'test-key', host: 'https://telemetry.test' });
});
