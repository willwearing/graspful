#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GraspfulApi, resolveCredentials, requireAuth, dumpYaml, parseYaml, telemetryConfig, hashCredential } from '@graspful/client';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod/v3';
import { TOOL_SCHEMAS } from './tool-schemas';
import { PostHog } from 'posthog-node';
import { randomUUID } from 'node:crypto';
import {
  CourseYamlSchema,
  QUALITY_CHECK_METADATA,
  validateParsedYaml,
  runQualityGate,
  describeCourse,
  scaffoldAcademyObject,
  scaffoldCourseObject,
  scaffoldBrandObject,
  fillConceptInRaw,
  publicationFailures,
} from '@graspful/shared';

// ─── PostHog analytics ──────────────────────────────────────────────────────

const { key: posthogKey, host: posthogHost } = telemetryConfig();
const posthogClient = posthogKey
  ? new PostHog(posthogKey, {
      host: posthogHost,
      flushAt: 1,
      flushInterval: 0,
    })
  : null;
const anonymousMcpDistinctId = `anonymous-mcp:${randomUUID()}`;

export function mcpDistinctId(): string {
  if (process.env.GRASPFUL_USER_ID) {
    return process.env.GRASPFUL_USER_ID;
  }

  const credentials = resolveCredentials();
  if (credentials.userId) return credentials.userId;
  const token = credentials.apiKey || credentials.jwt;
  if (token) return hashCredential(token);

  return anonymousMcpDistinctId;
}

function mcpCapture(event: string, properties: Record<string, unknown> = {}) {
  posthogClient?.capture({
    distinctId: mcpDistinctId(),
    event,
    properties: { ...properties, source: 'mcp' },
  });
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

function inputSchema(schema: ZodTypeAny): ToolDef['inputSchema'] {
  return zodToJsonSchema(schema, { $refStrategy: 'none' }) as ToolDef['inputSchema'];
}

const TOOLS: ToolDef[] = [
  {
    name: 'graspful_create_academy',
    description: `Generate an academy plan and manifest scaffold for an academy-first workflow. Every academy is a connected curriculum made of one or more real courses.

Use this before authoring course YAML when the topic should be decomposed into learner-facing parts. If you do not pass courseNames, the scaffold creates the four default planning layers: foundations, core structures, operational flows, and applied judgment. The result includes authoring gates for source material, learner promise, landing-page proof, graph checks, and review before publishing.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_create_academy),
  },
  {
    name: 'graspful_scaffold_course',
    description: `Generate a course YAML skeleton with sections, concepts, and prerequisite edges. Returns a minimal valid YAML structure with TODO placeholders.

This is step 1 of the Graspful two-YAML workflow:
1. Scaffold: Create the course graph (sections, concepts, prerequisites, difficulty levels)
2. Fill: Add knowledge points and problems to each concept using graspful_fill_concept

The scaffold contains NO learning content, just the graph structure. You should:
- Edit the returned YAML to add more concepts, adjust prerequisites, set correct difficulty levels (1-10)
- Set estimatedMinutes per concept
- Group concepts into sections
- Then call graspful_fill_concept for each concept to add KPs and problems`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_scaffold_course),
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
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_fill_concept),
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
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_validate),
  },
  {
    name: 'graspful_review_course',
    description: `Run all ${QUALITY_CHECK_METADATA.length} automated quality checks on a course YAML. Returns a score with details on each failure.

The checks are:
${QUALITY_CHECK_METADATA.map((check, index) => `${index + 1}. ${check.name}: ${check.description}`).join('\n')}

All automated checks must pass before publishing. Check factual accuracy against your sources separately. Run this before graspful_import_course with publish=true.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_review_course),
  },
  {
    name: 'graspful_import_academy',
    description: `Import an academy manifest and its referenced course YAMLs into a Graspful organization.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

If publish=true, Graspful imports the academy first and then attempts to publish each imported course. Returns the academy result plus confirmed publishedCourseIds and publishFailures. If any requested publication fails, isError is true and the result preserves the imported academy and successful publications.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_import_academy),
  },
  {
    name: 'graspful_import_course',
    description: `Import a course YAML into a Graspful organization. Creates the course as a draft by default.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

If publish=true, the server runs the review gate first - the course must pass all 10 quality checks to be published. If review fails, the course is imported as a draft and failures are returned.

Returns { courseId, url, published, review?, reviewFailures? }. If requested publication fails, isError is true and the result includes publicationFailures and status: imported_but_not_published.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_import_course),
  },
  {
    name: 'graspful_publish_course',
    description: `Publish a draft course (sets isPublished = true). The server runs the review gate - course must pass all 10 quality checks.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

Returns { courseId, published, url, review }. Publication is successful only when published is true. Otherwise isError is true and publicationFailures explains the review failures.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_publish_course),
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
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_describe_course),
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
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_create_brand),
  },
  {
    name: 'graspful_import_brand',
    description: `Import a brand YAML into Graspful. Creates the white-label site configuration.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

Returns { brand: { slug, domain }, domain: { verified, error?, dnsInstructions? } }.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_import_brand),
  },
  {
    name: 'graspful_list_courses',
    description: `List all courses in a Graspful organization.

IMPORTANT: Requires authentication. If not authenticated, run \`graspful register\` in a terminal first or set the \`GRASPFUL_API_KEY\` environment variable. Without auth, this tool will fail.

Returns an array of courses with their IDs, names, published status, and stats.`,
    inputSchema: inputSchema(TOOL_SCHEMAS.graspful_list_courses),
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
  if (!Object.hasOwn(TOOL_SCHEMAS, name)) return errorResult(`Unknown tool: ${name}`);
  const schema = TOOL_SCHEMAS[name as keyof typeof TOOL_SCHEMAS];
  if (!schema) return errorResult(`Unknown tool: ${name}`);
  const parsed = schema.safeParse(args);
  if (!parsed.success) return errorResult(`Invalid arguments for ${name}: ${parsed.error.message}`);
  args = parsed.data;
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
        const api = new GraspfulApi(requireAuth());
        const result = await api.importAcademy(args.org as string, {
          manifestYaml: args.manifestYaml as string,
          courseYamls: args.courseYamls as Record<string, string>,
          publish: args.publish as boolean | undefined,
          replace: args.replace as boolean | undefined,
          archiveMissing: args.archiveMissing as boolean | undefined,
        });
        const { publishedCourseIds, publishFailures } = result;

        mcpCapture('academy imported', {
          academy_id: result.academyId,
          org: args.org,
          course_count: result.courseCount,
          published_count: publishedCourseIds.length,
        });
        const resultMessage = publishFailures.length > 0 ? errorResult : textResult;
        return resultMessage(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Academy import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_import_course': {
      try {
        const api = new GraspfulApi(requireAuth());
        const result = await api.importCourse(args.org as string, {
          yaml: args.yaml as string,
          publish: args.publish as boolean | undefined,
          replace: args.replace as boolean | undefined,
          archiveMissing: args.archiveMissing as boolean | undefined,
        });
        mcpCapture('course imported', { course_id: result.courseId, org: args.org, published: result.published });
        if (args.publish && result.published !== true) {
          return errorResult(JSON.stringify({
            ...result,
            status: 'imported_but_not_published',
            publicationFailures: publicationFailures(result),
          }, null, 2));
        }
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_publish_course': {
      try {
        const api = new GraspfulApi(requireAuth());
        const result = await api.publish(args.org as string, args.courseId as string);
        if (result.published !== true) {
          return errorResult(JSON.stringify({
            ...result,
            status: 'not_published',
            publicationFailures: publicationFailures(result),
          }, null, 2));
        }
        mcpCapture('course published', { course_id: result.courseId, org: args.org, published: true });
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
        const api = new GraspfulApi(requireAuth());
        let raw: unknown;
        try {
          raw = parseYaml(args.yaml as string);
        } catch (e) {
          throw new Error(`YAML parse error: ${e instanceof Error ? e.message : String(e)}`);
        }
        const result = await api.importBrand(raw);
        mcpCapture('brand imported', { slug: result.brand.slug, domain: result.brand.domain });
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Brand import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_list_courses': {
      try {
        const api = new GraspfulApi(requireAuth());
        const result = await api.listCourses(args.org as string);
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
      version: (require('../package.json') as { version: string }).version,
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
