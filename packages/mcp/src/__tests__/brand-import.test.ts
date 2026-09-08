import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as yaml from 'js-yaml';
import { handleToolCall } from '../index';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GRASPFUL_API_KEY;
const originalApiUrl = process.env.GRASPFUL_API_URL;
let requests: Array<{ url: string; method: string | undefined; body: Record<string, unknown> }>;

beforeEach(() => {
  process.env.GRASPFUL_API_KEY = 'gsk_brand_import_test';
  process.env.GRASPFUL_API_URL = 'https://brand-import.test';
  requests = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method,
      body: JSON.parse(String(init?.body)),
    });
    return Response.json({
      slug: 'field-basics',
      domain: 'field-basics.example.com',
      verificationStatus: 'pending',
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GRASPFUL_API_KEY;
  else process.env.GRASPFUL_API_KEY = originalApiKey;
  if (originalApiUrl === undefined) delete process.env.GRASPFUL_API_URL;
  else process.env.GRASPFUL_API_URL = originalApiUrl;
});

const brand = {
  id: 'field-basics',
  name: 'Field basics',
  domain: 'field-basics.example.com',
  tagline: 'Learn field measurement',
  orgSlug: 'field-org',
};

async function importBrand(brandFields: Record<string, unknown> = {}, rootFields: Record<string, unknown> = {}) {
  const result = await handleToolCall('graspful_import_brand', {
    yaml: yaml.dump({ brand: { ...brand, ...brandFields }, ...rootFields }),
  });
  expect(result.isError).toBeUndefined();
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('https://brand-import.test/api/v1/brands');
  expect(requests[0].method).toBe('POST');
  return requests[0].body;
}

describe('graspful_import_brand HTTP payload', () => {
  test('serializes brand icons and the root course scope into the request', async () => {
    const faviconUrl = 'https://assets.example.com/field/favicon.svg';
    const ogImageUrl = 'https://assets.example.com/field/preview.png';
    const contentScope = { courseIds: ['measurement', 'field-safety'] };

    const body = await importBrand({ faviconUrl, ogImageUrl }, { contentScope });

    expect(body).toEqual({
      slug: brand.id,
      name: brand.name,
      domain: brand.domain,
      tagline: brand.tagline,
      logoUrl: '/logo.svg',
      faviconUrl,
      ogImageUrl,
      orgSlug: brand.orgSlug,
      theme: {},
      landing: {},
      seo: {},
      pricing: {},
      contentScope,
    });
  });

  test('omits optional icon and scope fields when they are absent from the YAML', async () => {
    const body = await importBrand();

    expect(body).not.toHaveProperty('faviconUrl');
    expect(body).not.toHaveProperty('ogImageUrl');
    expect(body).not.toHaveProperty('contentScope');
  });

  test.each([{}, { courseIds: [] }])('preserves explicitly empty icons and scope %p', async (contentScope) => {
    const body = await importBrand({ faviconUrl: '', ogImageUrl: '' }, { contentScope });

    expect(body).toHaveProperty('faviconUrl', '');
    expect(body).toHaveProperty('ogImageUrl', '');
    expect(body).toHaveProperty('contentScope', contentScope);
  });
});
