import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Command } from 'commander';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { registerImportCommand } from '../import';

describe('CLI brand import fields', () => {
  let directory: string;
  let previousFetch: typeof fetch;
  let previousKey: string | undefined;
  let previousUrl: string | undefined;
  let logSpy: ReturnType<typeof spyOn>;
  let sentBody: Record<string, unknown>;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'graspful-brand-import-test-'));
    previousFetch = globalThis.fetch;
    previousKey = process.env.GRASPFUL_API_KEY;
    previousUrl = process.env.GRASPFUL_API_URL;
    process.env.GRASPFUL_API_KEY = 'gsk_brand_import_test';
    process.env.GRASPFUL_API_URL = 'http://127.0.0.1:3000';
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('http://127.0.0.1:3000/api/v1/brands');
      expect(init?.method).toBe('POST');
      sentBody = JSON.parse(init?.body as string);
      return Response.json({
        brand: { slug: sentBody.slug, domain: sentBody.domain },
        domain: { verified: true },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GRASPFUL_API_KEY;
    else process.env.GRASPFUL_API_KEY = previousKey;
    if (previousUrl === undefined) delete process.env.GRASPFUL_API_URL;
    else process.env.GRASPFUL_API_URL = previousUrl;
    logSpy.mockRestore();
    rmSync(directory, { recursive: true, force: true });
  });

  async function importBrand(brandFields: Record<string, unknown> = {}, rootFields: Record<string, unknown> = {}) {
    const source = {
      brand: {
        id: 'field-academy',
        name: 'Field academy',
        domain: 'field.example.com',
        tagline: 'Practice field identification.',
        logoUrl: '/field-logo.svg',
        orgSlug: 'field-learning',
        ...brandFields,
      },
      theme: { preset: 'green' },
      landing: {
        hero: {
          headline: 'Learn field identification',
          subheadline: 'Compare observable field marks through practice.',
          ctaText: 'Browse courses',
        },
        features: {
          heading: 'Practice field marks',
          items: [{ title: 'Compare tracks', description: 'Study shape and size before identifying a track.', icon: 'Search' }],
        },
        howItWorks: {
          heading: 'Study and practice',
          items: [{ title: 'Read a lesson', description: 'Learn the distinguishing marks before answering questions.' }],
        },
      },
      seo: { title: 'Field academy', description: 'Study observable field marks.' },
      pricing: { monthly: 0 },
      ...rootFields,
    };
    const file = path.join(directory, 'brand.yaml');
    writeFileSync(file, yaml.dump(source));
    const program = new Command();
    registerImportCommand(program);
    await program.parseAsync(['bun', 'graspful', 'import', file]);
    return source;
  }

  test('sends favicon, Open Graph image, and course scope from their canonical YAML locations', async () => {
    const source = await importBrand(
      { faviconUrl: '/field-favicon.ico', ogImageUrl: 'https://field.example.com/preview.png' },
      { contentScope: { courseIds: ['antler-identification', 'track-identification'] } },
    );

    expect(sentBody!).toEqual({
      slug: source.brand.id,
      name: source.brand.name,
      domain: source.brand.domain,
      tagline: source.brand.tagline,
      logoUrl: source.brand.logoUrl,
      faviconUrl: '/field-favicon.ico',
      ogImageUrl: 'https://field.example.com/preview.png',
      orgSlug: source.brand.orgSlug,
      theme: source.theme,
      landing: source.landing,
      seo: source.seo,
      pricing: source.pricing,
      contentScope: { courseIds: ['antler-identification', 'track-identification'] },
    });
  });

  test('leaves absent optional fields absent in the HTTP JSON body', async () => {
    await importBrand();

    expect(sentBody!).not.toHaveProperty('faviconUrl');
    expect(sentBody!).not.toHaveProperty('ogImageUrl');
    expect(sentBody!).not.toHaveProperty('contentScope');
  });

  test('preserves explicit empty image values and an empty course scope', async () => {
    await importBrand({ faviconUrl: '', ogImageUrl: '' }, { contentScope: {} });

    expect(sentBody!.faviconUrl).toBe('');
    expect(sentBody!.ogImageUrl).toBe('');
    expect(sentBody!.contentScope).toEqual({});
  });
});
