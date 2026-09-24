import { z } from 'zod/v3';

const text = z.string().min(1);
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const yamlInput = z.object({ yaml: text.describe('The full YAML string') });
const importOptions = {
  org: text.describe('Organization slug'),
  publish: z.boolean().optional().describe('Publish imported courses after the review gate. Default: false'),
  replace: z.boolean().optional().describe('Replace existing content on import. Default: false'),
  archiveMissing: z.boolean().optional().describe('Archive removed content. Default: false'),
};

export const TOOL_SCHEMAS = {
  graspful_create_academy: z.object({
    topic: text.describe('Academy topic name'),
    courseNames: z.array(text).optional().describe('Ordered course names; defaults to four planning layers'),
    version: text.optional().describe('Academy version'),
  }),
  graspful_scaffold_course: z.object({
    topic: text.describe('Course topic name'),
    estimatedHours: positiveInteger.optional().describe('Estimated course hours. Default: 10'),
    sourceDocument: text.optional().describe('Source document reference'),
  }),
  graspful_fill_concept: yamlInput.extend({
    conceptId: text.describe('Existing concept ID with no knowledge points'),
    kps: positiveInteger.optional().describe('Number of knowledge point stubs. Default: 3'),
    problemsPerKp: positiveInteger.optional().describe('Problem stubs per knowledge point. Default: 3'),
  }),
  graspful_validate: yamlInput,
  graspful_review_course: yamlInput,
  graspful_import_academy: z.object({
    manifestYaml: text.describe('Academy manifest YAML'),
    courseYamls: z.record(z.string()).describe('Manifest file paths mapped to course YAML strings'),
    ...importOptions,
  }),
  graspful_import_course: yamlInput.extend(importOptions),
  graspful_publish_course: z.object({ courseId: text.describe('Course ID'), org: text.describe('Organization slug') }),
  graspful_describe_course: yamlInput,
  graspful_create_brand: z.object({
    niche: z.enum(['education', 'healthcare', 'finance', 'tech', 'legal']).describe('Brand niche preset'),
    name: text.optional(), topic: text.optional(), domain: text.optional(), orgSlug: text.optional(),
  }),
  graspful_import_brand: yamlInput,
  graspful_list_courses: z.object({ org: text.describe('Organization slug') }),
};
