#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as yaml from 'js-yaml';
import { PostHog } from 'posthog-node';
import { createHash, randomUUID } from 'node:crypto';
import {
  CourseYamlSchema,
  validateParsedYaml,
  runQualityGate,
  describeCourse,
  scaffoldAcademyObject,
  scaffoldCourseObject,
  scaffoldBrandObject,
  fillConceptInRaw,
} from '@graspful/shared';

// ─── PostHog analytics ──────────────────────────────────────────────────────

const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogClient = posthogKey
  ? new PostHog(posthogKey, {
      host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  : null;
const anonymousMcpDistinctId = `anonymous-mcp:${randomUUID()}`;

export function mcpDistinctId(): string {
  if (process.env.GRASPFUL_USER_ID) {
    return process.env.GRASPFUL_USER_ID;
  }

  if (process.env.GRASPFUL_API_KEY) {
    const digest = createHash('sha256')
      .update(process.env.GRASPFUL_API_KEY)
      .digest('hex');
    return `credential:${digest}`;
  }

  return anonymousMcpDistinctId;
}

function mcpCapture(event: string, properties: Record<string, unknown> = {}) {
  posthogClient?.capture({
    distinctId: mcpDistinctId(),
    event,
    properties: { ...properties, source: 'mcp' },
  });
}

// ─── Auth guard ─────────────────────────────────────────────────────────────

const AUTH_REQUIRED_ERROR =
  'Not authenticated. To authenticate, either:\n' +
  '1. Run `graspful register` in a terminal to complete browser auth and mint an API key, OR\n' +
  '2. Set the GRASPFUL_API_KEY environment variable (e.g., GRASPFUL_API_KEY=gsk_...).\n\n' +
  'You can scaffold, validate, and review courses without authentication. ' +
  'Authentication is only required for importing, publishing, and listing courses.';

function requireApiAuth(): void {
  const apiKey = process.env.GRASPFUL_API_KEY;
  if (!apiKey) {
    throw new Error(AUTH_REQUIRED_ERROR);
  }
}

// ─── API Client ─────────────────────────────────────────────────────────────

function getApiCredentials(): { baseUrl: string; authHeader?: string } {
  const baseUrl = (process.env.GRASPFUL_API_URL || 'https://api.graspful.ai').replace(/\/$/, '');
  const apiKey = process.env.GRASPFUL_API_KEY;
  if (apiKey) {
    return { baseUrl, authHeader: `Bearer ${apiKey}` };
  }
  return { baseUrl };
}

async function apiFetch<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const { baseUrl, authHeader } = getApiCredentials();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as T;
}

// ─── YAML helpers ───────────────────────────────────────────────────────────

const YAML_DUMP_OPTS = { lineWidth: 120, noRefs: true };

function parseYaml(yamlStr: string): unknown {
  return yaml.load(yamlStr);
}

function dumpYaml(obj: unknown): string {
  return yaml.dump(obj, YAML_DUMP_OPTS);
}

// ─── Tool definitions ───────────────────────────────────────────────────────

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const TOOLS: ToolDef[] = [
  {
    name: 'graspful_create_academy',
    description: `Generate an academy plan and manifest scaffold for an academy-first workflow. Every academy is a connected curriculum made of one or more real courses.

Use this before authoring course YAML when the topic should be decomposed into learner-facing parts. If you do not pass courseNames, the scaffold creates the four default planning layers: foundations, core structures, operational flows, and applied judgment. The result includes authoring gates for source material, learner promise, landing-page proof, graph checks, and review before publishing.`,
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Academy topic name (e.g., "PostHog TAM", "Linear Algebra")' },
        courseNames: {
          type: 'array',
          description: 'Optional ordered course names to include in the manifest',
          items: { type: 'string' },
        },
        version: { type: 'string', description: 'Academy version string (default: 2026.1)' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'graspful_scaffold_course',
    description: `Generate a course YAML skeleton with sections, concepts, and prerequisite edges. Returns a minimal valid YAML structure with TODO placeholders.

This is step 1 of the Graspful two-YAML workflow:
1. Scaffold: Create the course graph (sections, concepts, prerequisites, difficulty levels)
2. Fill: Add knowledge points and problems to each concept using graspful_fill_concept

The scaffold contains NO learning content — just the graph structure. You should:
- Edit the returned YAML to add more concepts, adjust prerequisites, set correct difficulty levels (1-10)
- Set estimatedMinutes per concept
- Group concepts into sections
- Then call graspful_fill_concept for each concept to add KPs and problems`,
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Course topic name (e.g., "Linear Algebra", "AWS Solutions Architect")' },
        estimatedHours: { type: 'number', description: 'Estimated total course hours (default: 10)' },
        sourceDocument: { type: 'string', description: 'Reference to source material (e.g., textbook, spec URL)' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'graspful_fill_concept',
    description: `Add knowledge point (KP) and problem stubs to a specific concept in a course YAML. Returns the full updated YAML.

Each KP stub includes:
- instruction: TODO placeholder for teaching content (markdown)
- workedExample: TODO placeholder for a step-by-step example
- problems: Multiple-choice problem stubs with difficulty staircase (2, 3, 4, 5)

After filling, you should replace the TODO placeholders with real content:
- Write clear, concise instructions teaching the knowledge point
- Create a worked example showing the concept applied step by step
- Write diverse problems testing the same KP at different difficulty levels
- Ensure each KP has 3+ problems for the adaptive engine to work well

Fails if the concept already has KPs (to prevent accidental overwrites).`,
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The full course YAML string' },
        conceptId: { type: 'string', description: 'ID of the concept to fill (must exist in the YAML and have 0 KPs)' },
        kps: { type: 'number', description: 'Number of KP stubs to add as a starting point (default: 3, not a cap)' },
        problemsPerKp: { type: 'number', description: 'Number of problem stubs per KP (default: 3)' },
      },
      required: ['yaml', 'conceptId'],
    },
  },
  {
    name: 'graspful_validate',
    description: `Validate any Graspful YAML (course, brand, or academy manifest) against its Zod schema. Auto-detects the file type from the top-level key.

For course YAML, also checks:
- All prerequisite references point to existing concept IDs
- The prerequisite graph is a DAG (no cycles)

Returns { valid, fileType, errors, stats }. If valid is false, errors contains human-readable messages.
Stats include concept/KP/problem counts for courses.

Run this before graspful_import_course to catch errors early.`,
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The YAML string to validate (course, brand, or academy manifest)' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'graspful_review_course',
    description: `Run all 10 mechanical quality checks on a course YAML. Returns a score (e.g., "8/10") with details on each failure.

The 10 checks are:
1. yaml_parses — Valid Zod schema
2. unique_problem_ids — No duplicate problem IDs across the course
3. prerequisites_valid — All prerequisite refs point to real concepts
4. question_deduplication — No near-duplicate questions at the same difficulty
5. difficulty_staircase — Each concept has problems at 2+ difficulty levels
6. problem_teaching_alignment — Problems only assess material introduced in the current lesson path
7. problem_variant_depth — Each KP has 3+ problems
8. instruction_formatting — Long instructions have content blocks
9. worked_example_coverage — 50%+ of authored concepts have worked examples
10. import_dry_run — DAG is valid (no cycles, valid refs)

A score of 10/10 is required for publishing. Run this before graspful_import_course --publish.`,
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The full course YAML string to review' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'graspful_import_academy',
    description: `Import an academy manifest and its referenced course YAMLs into a Graspful organization.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

If publish=true, Graspful imports the academy first and then attempts to publish each imported course. Returns the academy result plus publishedCourseIds and publishFailures.`,
    inputSchema: {
      type: 'object',
      properties: {
        manifestYaml: { type: 'string', description: 'The full academy manifest YAML string' },
        courseYamls: {
          type: 'object',
          description: 'Object mapping manifest file paths to the full course YAML strings',
        },
        org: { type: 'string', description: 'Organization slug (e.g., "acme-learning")' },
        publish: { type: 'boolean', description: 'If true, publish every imported course after academy import. Default: false' },
        replace: { type: 'boolean', description: 'Replace existing academy/course content on re-import. Default: false' },
        archiveMissing: { type: 'boolean', description: 'Archive removed content on re-import. Default: false' },
      },
      required: ['manifestYaml', 'courseYamls', 'org'],
    },
  },
  {
    name: 'graspful_import_course',
    description: `Import a course YAML into a Graspful organization. Creates the course as a draft by default.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

If publish=true, the server runs the review gate first - the course must pass all 10 quality checks to be published. If review fails, the course is imported as a draft and failures are returned.

Returns { courseId, url, published, reviewFailures? }.`,
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The full course YAML string to import' },
        org: { type: 'string', description: 'Organization slug (e.g., "acme-learning")' },
        publish: { type: 'boolean', description: 'If true, publish immediately (runs review gate). Default: false' },
      },
      required: ['yaml', 'org'],
    },
  },
  {
    name: 'graspful_publish_course',
    description: `Publish a draft course (sets isPublished = true). The server runs the review gate - course must pass all 10 quality checks.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

Returns { courseId, published }.`,
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'The course ID (UUID) to publish' },
        org: { type: 'string', description: 'Organization slug' },
      },
      required: ['courseId', 'org'],
    },
  },
  {
    name: 'graspful_describe_course',
    description: `Compute statistics for a course YAML without importing it. Useful for progress tracking during course authoring.

Returns:
- courseName, courseId, version, estimatedHours
- Total concepts (authored vs stubs), KPs, problems
- Prerequisite graph depth
- Missing content: concepts without KPs, KPs without problems
- Per-section breakdown

Use this to check your progress: "How many concepts still need content?"`,
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The full course YAML string' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'graspful_create_brand',
    description: `Generate a brand YAML scaffold for a white-label learning site. Graspful supports multi-tenant white-labeling - each brand gets its own domain, theme, landing page, and SEO config.

Niche presets: education, healthcare, finance, tech, legal. Each sets appropriate colors, taglines, and copy.

The returned YAML has the full brand structure:
- brand: id, name, domain, tagline, orgSlug
- theme: color preset, border radius
- landing: hero, features, how-it-works, FAQ
- seo: title, description, keywords

Edit the YAML to customize, then import with \`graspful_import_brand\`.`,
    inputSchema: {
      type: 'object',
      properties: {
        niche: { type: 'string', description: 'Brand niche: education, healthcare, finance, tech, or legal' },
        name: { type: 'string', description: 'Brand name (default: "{Niche} Academy")' },
        topic: { type: 'string', description: 'Academy topic for more specific landing-page copy' },
        domain: { type: 'string', description: 'Custom domain (default: "{slug}.graspful.ai")' },
        orgSlug: { type: 'string', description: 'Organization slug to associate with' },
      },
      required: ['niche'],
    },
  },
  {
    name: 'graspful_import_brand',
    description: `Import a brand YAML into Graspful. Creates the white-label site configuration.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

Returns { slug, domain, verificationStatus }.`,
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The full brand YAML string to import' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'graspful_list_courses',
    description: `List all courses in a Graspful organization.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

Returns an array of courses with their IDs, names, published status, and stats.`,
    inputSchema: {
      type: 'object',
      properties: {
        org: { type: 'string', description: 'Organization slug (e.g., "acme-learning")' },
      },
      required: ['org'],
    },
  },
];

// ─── Tool dispatcher ────────────────────────────────────────────────────────

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function errorResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'graspful_create_academy': {
      const topic = args.topic as string;
      const obj = scaffoldAcademyObject(topic, {
        courseNames: args.courseNames as string[] | undefined,
        version: args.version as string | undefined,
      });
      mcpCapture('academy scaffolded', { topic, course_count: obj.courses.length });
      return textResult(dumpYaml(obj));
    }

    case 'graspful_scaffold_course': {
      const topic = args.topic as string;
      const obj = scaffoldCourseObject(topic, {
        hours: args.estimatedHours as number | undefined,
        source: args.sourceDocument as string | undefined,
      });
      mcpCapture('course scaffolded', { topic, estimated_hours: args.estimatedHours });
      return textResult(dumpYaml(obj));
    }

    case 'graspful_fill_concept': {
      try {
        const conceptId = args.conceptId as string;
        const raw = parseYaml(args.yaml as string);
        const updated = fillConceptInRaw(raw, conceptId, {
          kps: args.kps as number | undefined,
          problemsPerKp: args.problemsPerKp as number | undefined,
        });
        mcpCapture('concept filled', { concept_id: conceptId });
        return textResult(dumpYaml(updated));
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }

    case 'graspful_validate': {
      let raw: unknown;
      try {
        raw = parseYaml(args.yaml as string);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return textResult(JSON.stringify({ valid: false, errors: [`YAML parse error: ${msg}`], stats: {} }, null, 2));
      }
      const result = validateParsedYaml(raw);
      mcpCapture('course validated', { valid: result.valid, error_count: result.errors.length, file_type: result.fileType });
      return textResult(JSON.stringify(result, null, 2));
    }

    case 'graspful_review_course': {
      let raw: unknown;
      try {
        raw = parseYaml(args.yaml as string);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return textResult(JSON.stringify({
          passed: false,
          score: '0/10',
          failures: [{ check: 'yaml_parses', passed: false, details: `YAML parse error: ${msg}` }],
          warnings: [],
          stats: { concepts: 0, kps: 0, problems: 0, authoredConcepts: 0, stubConcepts: 0 },
        }, null, 2));
      }
      const result = runQualityGate(raw);
      mcpCapture('course reviewed', { score: result.score, passed: result.passed });
      return textResult(JSON.stringify(result, null, 2));
    }

    case 'graspful_import_academy': {
      try {
        requireApiAuth();
        const result = await apiFetch<{
          academyId: string;
          academySlug: string;
          partCount: number;
          courseCount: number;
          courseResults: Array<{ courseId: string }>;
          warnings: string[];
        }>(
          'POST',
          `/api/v1/orgs/${args.org}/academies/import`,
          {
            manifestYaml: args.manifestYaml,
            courseYamls: args.courseYamls,
            replace: args.replace ?? false,
            archiveMissing: args.archiveMissing ?? false,
          },
        );

        const publishedCourseIds: string[] = [];
        const publishFailures: string[] = [];

        if (args.publish) {
          for (const courseResult of result.courseResults) {
            try {
              await apiFetch(
                'POST',
                `/api/v1/orgs/${args.org}/courses/${courseResult.courseId}/publish`,
                {},
              );
              publishedCourseIds.push(courseResult.courseId);
            } catch (error) {
              publishFailures.push(
                `${courseResult.courseId}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        }

        mcpCapture('academy imported', {
          academy_id: result.academyId,
          org: args.org,
          course_count: result.courseCount,
          published_count: publishedCourseIds.length,
        });
        return textResult(
          JSON.stringify(
            {
              ...result,
              publishedCourseIds,
              publishFailures,
            },
            null,
            2,
          ),
        );
      } catch (e) {
        return errorResult(`Academy import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_import_course': {
      try {
        requireApiAuth();
        const result = await apiFetch<{ courseId: string; url: string; published: boolean; reviewFailures?: string[] }>(
          'POST',
          `/api/v1/orgs/${args.org}/courses/import`,
          { yaml: args.yaml, publish: args.publish ?? false },
        );
        mcpCapture('course imported', { course_id: result.courseId, org: args.org, published: result.published });
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_publish_course': {
      try {
        requireApiAuth();
        const result = await apiFetch<{ courseId: string; published: boolean }>(
          'POST',
          `/api/v1/orgs/${args.org}/courses/${args.courseId}/publish`,
          {},
        );
        mcpCapture('course published', { course_id: result.courseId, org: args.org, published: result.published });
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Publish failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_describe_course': {
      try {
        const raw = parseYaml(args.yaml as string);
        const parsed = CourseYamlSchema.parse(raw);
        const stats = describeCourse(parsed);
        mcpCapture('course described', stats as unknown as Record<string, unknown>);
        return textResult(JSON.stringify(stats, null, 2));
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }

    case 'graspful_create_brand': {
      const niche = args.niche as string;
      const obj = scaffoldBrandObject(niche, {
        name: args.name as string | undefined,
        topic: args.topic as string | undefined,
        domain: args.domain as string | undefined,
        orgSlug: args.orgSlug as string | undefined,
      });
      mcpCapture('brand scaffolded', { niche });
      return textResult(dumpYaml(obj));
    }

    case 'graspful_import_brand': {
      try {
        requireApiAuth();
        let raw: unknown;
        try {
          raw = parseYaml(args.yaml as string);
        } catch (e) {
          throw new Error(`YAML parse error: ${e instanceof Error ? e.message : String(e)}`);
        }
        const parsed = raw as Record<string, unknown>;
        const brandSection = (parsed.brand || {}) as Record<string, unknown>;
        const dto = {
          slug: brandSection.id || brandSection.slug,
          name: brandSection.name,
          domain: brandSection.domain,
          tagline: brandSection.tagline || '',
          logoUrl: (brandSection.logoUrl as string) || '/logo.svg',
          orgSlug: brandSection.orgSlug,
          theme: parsed.theme || {},
          landing: parsed.landing || {},
          seo: parsed.seo || {},
          pricing: parsed.pricing || {},
        };
        const result = await apiFetch<{ slug: string; domain: string; verificationStatus: string }>(
          'POST',
          '/api/v1/brands',
          dto,
        );
        mcpCapture('brand imported', { slug: result.slug, domain: result.domain });
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Brand import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_list_courses': {
      try {
        requireApiAuth();
        const result = await apiFetch<unknown[]>(
          'GET',
          `/api/v1/orgs/${args.org}/courses`,
        );
        mcpCapture('courses listed', { org: args.org, count: result.length });
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`List failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

export { TOOLS, handleToolCall };

// ─── MCP Server (only when run directly) ────────────────────────────────────

if (require.main === module) {
  const server = new Server(
    {
      name: 'graspful',
      version: '0.2.4',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args ?? {});
  });

  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

  async function shutdown() {
    if (posthogClient) await posthogClient.shutdown();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
