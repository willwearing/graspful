import { BrandSettingsSchema, CourseYamlSchema, scaffoldCourseObject } from '@graspful/shared';
import { parse, stringify } from 'yaml';

export const COURSE_CONTENT_TEMPLATE = `# Course draft. Add source material, teaching, and questions before publishing.
# Schema: https://graspful.ai/docs/course-schema
${stringify(scaffoldCourseObject('My course', {}))}`;

export type CreatorApiFetch = <T>(path: string, token: string, options?: RequestInit) => Promise<T>;

export interface BrandSettings {
  name?: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  theme?: Record<string, unknown>;
  landing?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  contentScope?: Record<string, unknown>;
}

export interface CreatorBrand extends BrandSettings {
  slug: string;
  name: string;
  orgSlug: string;
  domain: string;
}

const STRING_FIELDS = ['name', 'tagline', 'logoUrl', 'faviconUrl', 'ogImageUrl'] as const;
const OBJECT_FIELDS = ['theme', 'landing', 'seo', 'pricing', 'contentScope'] as const;
const EDITABLE_FIELDS = [...STRING_FIELDS, ...OBJECT_FIELDS];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function brandSettingsYaml(brand: CreatorBrand): string {
  const settings = Object.fromEntries(
    EDITABLE_FIELDS.filter((key) => brand[key] != null).map((key) => [key, brand[key]]),
  );
  return `# Settings for ${brand.slug}. Saved with the brand settings API.
# These settings apply to all courses that use this brand.
# Included settings replace saved values. Omitted settings keep saved values.
${stringify(settings)}`;
}

/** Preserve nested configuration, including valid empty defaults from provisioning. */
export function parseBrandSettings(yaml: string): BrandSettings {
  const value: unknown = parse(yaml);
  if (!isObject(value) || Object.keys(value).length === 0) {
    throw new Error('Brand settings must contain at least one editable setting.');
  }
  for (const [key, field] of Object.entries(value)) {
    if (!(EDITABLE_FIELDS as readonly string[]).includes(key)) {
      throw new Error(`Unsupported brand setting: ${key}. Domain and brand identity are managed through the CLI.`);
    }
    if ((STRING_FIELDS as readonly string[]).includes(key) && typeof field !== 'string') {
      throw new Error(`${key} must be text.`);
    }
    if ((OBJECT_FIELDS as readonly string[]).includes(key) && !isObject(field)) {
      throw new Error(`${key} must contain named settings.`);
    }
  }
  const validated = BrandSettingsSchema.safeParse(value);
  if (!validated.success) {
    throw new Error(validated.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'));
  }
  return value as BrandSettings;
}

export function courseImportPayload(yaml: string, existingSlug?: string) {
  const result = CourseYamlSchema.safeParse(parse(yaml));
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'));
  }
  if (existingSlug && result.data.course.id !== existingSlug) {
    throw new Error(`Keep course.id as "${existingSlug}" when editing this course. Use New course to create another course.`);
  }
  return { yaml, ...(existingSlug ? { replace: true } : {}) };
}

export function courseSlugFromYaml(yaml: string): string {
  // Existing content may need repairs after validation rules become stricter.
  // Keep the editor available, then validate the full document when saving.
  const value: unknown = parse(yaml);
  if (!isObject(value) || !isObject(value.course) || typeof value.course.id !== 'string' || !value.course.id) {
    throw new Error('The saved course is missing course.id.');
  }
  return value.course.id;
}

export function downloadYaml(yaml: string, filename: string) {
  const url = URL.createObjectURL(new Blob([yaml], { type: 'text/yaml' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
