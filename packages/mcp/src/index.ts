#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import {
  CourseYamlSchema,
  BrandYamlSchema,
  AcademyManifestSchema,
} from '@graspful/shared';
import type { CourseYaml, QualityCheckResult, QualityGateResult } from '@graspful/shared';

// ─── Auth guard ─────────────────────────────────────────────────────────────

const AUTH_REQUIRED_ERROR =
  'Not authenticated. To authenticate, either:\n' +
  '1. Call the graspful_register tool with an email and password to create an account and get an API key, OR\n' +
  '2. Set the GRASPFUL_API_KEY environment variable (e.g., GRASPFUL_API_KEY=gsk_...).\n\n' +
  'You can scaffold, validate, and review courses without authentication. ' +
  'Authentication is only required for importing, publishing, and listing courses.';

function requireApiAuth(): void {
  const apiKey = process.env.GRASPFUL_API_KEY;
  if (!apiKey) {
    throw new Error(AUTH_REQUIRED_ERROR);
  }
}

// ─── API Client (mirrors packages/cli/src/lib/api-client.ts) ──────────────

function getApiCredentials(): { baseUrl: string; authHeader?: string } {
  const baseUrl = (process.env.GRASPFUL_API_URL || 'https://api.graspful.ai').replace(/\/$/, '');
  const apiKey = process.env.GRASPFUL_API_KEY;
  if (apiKey) {
    return { baseUrl, authHeader: `Bearer ${apiKey}` };
  }
  return { baseUrl };
}

async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const { baseUrl, authHeader } = getApiCredentials();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as T;
}

async function apiGet<T = unknown>(path: string): Promise<T> {
  const { baseUrl, authHeader } = getApiCredentials();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as T;
}

// ─── Scaffold helpers (mirrors packages/cli/src/commands/create-course.ts) ──

function scaffoldCourse(topic: string, options: { hours?: number; source?: string }): string {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return yaml.dump({
    course: {
      id: slug,
      name: topic,
      description: `Adaptive course on ${topic}`,
      estimatedHours: options.hours || 10,
      version: '2026.1',
      sourceDocument: options.source || 'TODO: Add source document',
    },
    sections: [
      { id: 'foundations', name: 'Foundations', description: 'Core concepts' },
      { id: 'application', name: 'Application', description: 'Applied concepts' },
    ],
    concepts: [
      {
        id: `${slug}-intro`,
        name: `Introduction to ${topic}`,
        section: 'foundations',
        difficulty: 2,
        estimatedMinutes: 15,
        tags: ['foundational'],
        prerequisites: [],
        knowledgePoints: [],
      },
    ],
  }, { lineWidth: 120, noRefs: true });
}

function scaffoldBrand(niche: string, options: { name?: string; domain?: string; orgSlug?: string }): string {
  const NICHE_PRESETS: Record<string, { preset: string; tagline: string; headline: string }> = {
    education: { preset: 'blue', tagline: 'Learn smarter, not harder', headline: 'Master any subject with adaptive learning' },
    healthcare: { preset: 'emerald', tagline: 'Training that saves lives', headline: 'Adaptive healthcare education for professionals' },
    finance: { preset: 'slate', tagline: 'Build financial expertise', headline: 'Master finance with adaptive learning' },
    tech: { preset: 'indigo', tagline: 'Level up your skills', headline: 'Adaptive tech training that meets you where you are' },
    legal: { preset: 'amber', tagline: 'Know the law, pass the exam', headline: 'Adaptive legal education for exam success' },
    default: { preset: 'blue', tagline: 'Learn adaptively', headline: 'Personalized learning that works' },
  };

  const config = NICHE_PRESETS[niche] || NICHE_PRESETS['default'];
  const slug = (options.name || niche).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = options.name || `${niche.charAt(0).toUpperCase() + niche.slice(1)} Academy`;
  const domain = options.domain || `${slug}.graspful.ai`;

  return yaml.dump({
    brand: {
      id: slug,
      name,
      domain,
      tagline: config.tagline,
      orgSlug: options.orgSlug || 'TODO: your-org-slug',
    },
    theme: {
      preset: config.preset,
      radius: '0.5rem',
    },
    landing: {
      hero: {
        headline: config.headline,
        subheadline: `${name} uses adaptive learning to help you master concepts faster.`,
        ctaText: 'Start Learning',
      },
      features: {
        heading: 'Why choose us?',
        items: [
          { title: 'Adaptive Learning', description: 'Content adapts to your knowledge level', icon: 'brain' },
          { title: 'Spaced Repetition', description: 'Review at optimal intervals for lasting memory', icon: 'clock' },
          { title: 'Progress Tracking', description: 'See exactly where you stand', icon: 'chart' },
        ],
      },
      howItWorks: {
        heading: 'How it works',
        items: [
          { title: 'Take a diagnostic', description: 'We assess what you already know' },
          { title: 'Learn adaptively', description: 'Focus on gaps, skip what you know' },
          { title: 'Master the material', description: 'Prove mastery through progressive challenges' },
        ],
      },
      faq: [],
    },
    seo: {
      title: `${name} — Adaptive Learning`,
      description: config.tagline,
      keywords: [niche, 'learning', 'adaptive', 'education'],
    },
  }, { lineWidth: 120, noRefs: true });
}

// ─── Validate helpers (mirrors packages/cli/src/commands/validate.ts) ───────

type FileType = 'course' | 'brand' | 'academy';

function detectFileType(data: unknown): FileType | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if ('course' in obj) return 'course';
  if ('brand' in obj) return 'brand';
  if ('academy' in obj) return 'academy';
  return null;
}

function detectCycles(concepts: Array<{ id: string; prerequisites: string[] }>): string[] {
  const graph = new Map<string, string[]>();
  for (const c of concepts) {
    graph.set(c.id, c.prerequisites);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[] = [];

  function dfs(node: string, path: string[]): boolean {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      cycles.push(`Cycle: ${cycle.join(' -> ')}`);
      return true;
    }
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of graph.get(node) ?? []) {
      dfs(dep, path);
    }

    path.pop();
    inStack.delete(node);
    return false;
  }

  for (const id of graph.keys()) {
    if (!visited.has(id)) {
      dfs(id, []);
    }
  }

  return cycles;
}

function validateYaml(yamlStr: string): { valid: boolean; fileType?: string; errors: string[]; stats: Record<string, unknown> } {
  let raw: unknown;
  try {
    raw = yaml.load(yamlStr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, errors: [`YAML parse error: ${msg}`], stats: {} };
  }

  const fileType = detectFileType(raw);
  if (!fileType) {
    return { valid: false, errors: ['Could not detect file type. Expected top-level key: course, brand, or academy'], stats: {} };
  }

  const schemaMap = {
    course: CourseYamlSchema,
    brand: BrandYamlSchema,
    academy: AcademyManifestSchema,
  };

  const result = schemaMap[fileType].safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    );
    return { valid: false, fileType, errors, stats: {} };
  }

  // For courses, also check DAG
  const dagErrors: string[] = [];
  let stats: Record<string, unknown> = { fileType };

  if (fileType === 'course') {
    const data = result.data as { concepts: Array<{ id: string; prerequisites: string[]; knowledgePoints: Array<{ problems: unknown[] }> }> };
    const conceptIds = new Set(data.concepts.map((c) => c.id));

    for (const concept of data.concepts) {
      for (const prereq of concept.prerequisites) {
        if (!conceptIds.has(prereq)) {
          dagErrors.push(`Concept "${concept.id}" has unknown prerequisite "${prereq}"`);
        }
      }
    }

    const cycles = detectCycles(
      data.concepts.map((c) => ({ id: c.id, prerequisites: c.prerequisites })),
    );
    dagErrors.push(...cycles);

    const kpCount = data.concepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
    const problemCount = data.concepts.reduce(
      (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
      0,
    );

    stats = { fileType, concepts: data.concepts.length, knowledgePoints: kpCount, problems: problemCount };
  }

  if (dagErrors.length > 0) {
    return { valid: false, fileType, errors: dagErrors, stats };
  }

  return { valid: true, fileType, errors: [], stats };
}

// ─── Review helpers (mirrors packages/cli/src/commands/review.ts) ───────────

function checkYamlParses(raw: unknown): QualityCheckResult {
  const result = CourseYamlSchema.safeParse(raw);
  if (result.success) {
    return { check: 'yaml_parses', passed: true };
  }
  const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return {
    check: 'yaml_parses',
    passed: false,
    details: `${errors.length} schema error(s): ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (+${errors.length - 5} more)` : ''}`,
  };
}

function checkUniqueProblemIds(data: CourseYaml): QualityCheckResult {
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const concept of data.concepts) {
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        if (seen.has(problem.id)) {
          duplicates.push(problem.id);
        }
        seen.add(problem.id);
      }
    }
  }

  if (duplicates.length === 0) {
    return { check: 'unique_problem_ids', passed: true };
  }
  return {
    check: 'unique_problem_ids',
    passed: false,
    details: `Duplicate problem IDs: ${duplicates.join(', ')}`,
  };
}

function checkPrerequisitesValid(data: CourseYaml): QualityCheckResult {
  const conceptIds = new Set(data.concepts.map((c) => c.id));
  const invalid: string[] = [];

  for (const concept of data.concepts) {
    for (const prereq of concept.prerequisites) {
      if (!conceptIds.has(prereq)) {
        invalid.push(`${concept.id} -> ${prereq}`);
      }
    }
  }

  if (invalid.length === 0) {
    return { check: 'prerequisites_valid', passed: true };
  }
  return {
    check: 'prerequisites_valid',
    passed: false,
    details: `Unknown prerequisites: ${invalid.join(', ')}`,
  };
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function checkQuestionDeduplication(data: CourseYaml): QualityCheckResult {
  const seen = new Map<string, { problemId: string }>();
  const collisions: string[] = [];

  for (const concept of data.concepts) {
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        const normalized = normalizeText(problem.question);
        const hash = crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
        const key = `${hash}-d${problem.difficulty ?? 'none'}`;

        const existing = seen.get(key);
        if (existing) {
          collisions.push(`"${problem.id}" collides with "${existing.problemId}" (same question text at same difficulty)`);
        } else {
          seen.set(key, { problemId: problem.id });
        }
      }
    }
  }

  if (collisions.length === 0) {
    return { check: 'question_deduplication', passed: true };
  }
  return {
    check: 'question_deduplication',
    passed: false,
    details: collisions.slice(0, 5).join('; ') + (collisions.length > 5 ? ` (+${collisions.length - 5} more)` : ''),
  };
}

function checkDifficultyStaircase(data: CourseYaml): QualityCheckResult {
  const failures: string[] = [];

  for (const concept of data.concepts) {
    if (concept.knowledgePoints.length === 0) continue;

    const difficulties = new Set<number>();
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        if (problem.difficulty != null) {
          difficulties.add(problem.difficulty);
        }
      }
    }

    if (difficulties.size > 0 && difficulties.size < 2) {
      failures.push(`"${concept.id}" has problems at only ${difficulties.size} difficulty level(s) — need 2+`);
    }
  }

  if (failures.length === 0) {
    return { check: 'difficulty_staircase', passed: true };
  }
  return {
    check: 'difficulty_staircase',
    passed: false,
    details: failures.slice(0, 5).join('; ') + (failures.length > 5 ? ` (+${failures.length - 5} more)` : ''),
  };
}

function extractStems(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 4);
}

function checkCrossConceptCoverage(data: CourseYaml): QualityCheckResult {
  const stemConceptCount = new Map<string, Set<string>>();

  for (const concept of data.concepts) {
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        const stems = extractStems(problem.question);
        for (const stem of stems) {
          if (!stemConceptCount.has(stem)) {
            stemConceptCount.set(stem, new Set());
          }
          stemConceptCount.get(stem)!.add(concept.id);
        }
      }
    }
  }

  const overused: string[] = [];
  for (const [stem, concepts] of stemConceptCount) {
    if (concepts.size > 3) {
      overused.push(`"${stem}" appears across ${concepts.size} concepts`);
    }
  }

  const commonWords = new Set([
    'which', 'would', 'should', 'could', 'about', 'their', 'there', 'these', 'those',
    'being', 'between', 'through', 'during', 'before', 'after', 'above', 'below',
    'following', 'statement', 'answer', 'question', 'correct', 'incorrect',
    'agent', 'property', 'owner', 'buyer', 'seller',
  ]);

  const meaningfulOverused = overused.filter((entry) => {
    const stem = entry.match(/"([^"]+)"/)?.[1] ?? '';
    return !commonWords.has(stem);
  });

  if (meaningfulOverused.length === 0) {
    return { check: 'cross_concept_coverage', passed: true };
  }
  return {
    check: 'cross_concept_coverage',
    passed: meaningfulOverused.length <= 5,
    details: meaningfulOverused.slice(0, 5).join('; ') + (meaningfulOverused.length > 5 ? ` (+${meaningfulOverused.length - 5} more)` : ''),
  };
}

function checkProblemVariantDepth(data: CourseYaml): QualityCheckResult {
  const failures: string[] = [];

  for (const concept of data.concepts) {
    if (concept.knowledgePoints.length === 0) continue;

    for (const kp of concept.knowledgePoints) {
      if (kp.problems.length < 3) {
        failures.push(`"${concept.id}/${kp.id}" has ${kp.problems.length} problem(s) — need 3+`);
      }
    }
  }

  if (failures.length === 0) {
    return { check: 'problem_variant_depth', passed: true };
  }
  return {
    check: 'problem_variant_depth',
    passed: false,
    details: failures.slice(0, 5).join('; ') + (failures.length > 5 ? ` (+${failures.length - 5} more)` : ''),
  };
}

function checkInstructionFormatting(data: CourseYaml): QualityCheckResult {
  const warnings: string[] = [];

  for (const concept of data.concepts) {
    for (const kp of concept.knowledgePoints) {
      if (!kp.instruction) continue;
      if (kp.instruction.match(/^[\w\-./]+\.(md|txt|html)$/)) continue;

      const wordCount = kp.instruction.split(/\s+/).filter(Boolean).length;
      const hasContentBlocks = kp.instructionContent && kp.instructionContent.length > 0;

      if (wordCount > 100 && !hasContentBlocks) {
        warnings.push(`"${concept.id}/${kp.id}" instruction is ${wordCount} words with no content blocks`);
      }
    }
  }

  if (warnings.length === 0) {
    return { check: 'instruction_formatting', passed: true };
  }
  return {
    check: 'instruction_formatting',
    passed: false,
    details: warnings.slice(0, 5).join('; ') + (warnings.length > 5 ? ` (+${warnings.length - 5} more)` : ''),
  };
}

function checkWorkedExampleCoverage(data: CourseYaml): QualityCheckResult {
  const authoredConcepts = data.concepts.filter((c) => c.knowledgePoints.length > 0);
  if (authoredConcepts.length === 0) {
    return { check: 'worked_example_coverage', passed: true };
  }

  const withExamples = authoredConcepts.filter((c) =>
    c.knowledgePoints.some((kp) => kp.workedExample && kp.workedExample.trim().length > 0),
  );

  const coverage = withExamples.length / authoredConcepts.length;
  if (coverage >= 0.5) {
    return { check: 'worked_example_coverage', passed: true };
  }
  return {
    check: 'worked_example_coverage',
    passed: false,
    details: `${withExamples.length}/${authoredConcepts.length} authored concepts have worked examples (${Math.round(coverage * 100)}%) — need 50%+`,
  };
}

function checkImportDryRun(data: CourseYaml): QualityCheckResult {
  const conceptIds = new Set(data.concepts.map((c) => c.id));
  const errors: string[] = [];

  for (const concept of data.concepts) {
    for (const prereq of concept.prerequisites) {
      if (!conceptIds.has(prereq)) {
        errors.push(`Unknown prerequisite: ${concept.id} -> ${prereq}`);
      }
    }
  }

  const graph = new Map<string, string[]>();
  for (const c of data.concepts) {
    graph.set(c.id, [...c.prerequisites]);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(node: string, path: string[]): boolean {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      errors.push(`Cycle detected: ${cycle.join(' -> ')}`);
      return true;
    }
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    let foundCycle = false;
    for (const dep of graph.get(node) ?? []) {
      if (hasCycle(dep, path)) {
        foundCycle = true;
      }
    }

    path.pop();
    inStack.delete(node);
    return foundCycle;
  }

  for (const id of graph.keys()) {
    if (!visited.has(id)) {
      hasCycle(id, []);
    }
  }

  if (errors.length === 0) {
    return { check: 'import_dry_run', passed: true };
  }
  return {
    check: 'import_dry_run',
    passed: false,
    details: errors.join('; '),
  };
}

function runReview(yamlStr: string): QualityGateResult {
  let raw: unknown;
  try {
    raw = yaml.load(yamlStr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      passed: false,
      score: '0/10',
      failures: [{ check: 'yaml_parses', passed: false, details: `YAML parse error: ${msg}` }],
      warnings: [],
      stats: { concepts: 0, kps: 0, problems: 0, authoredConcepts: 0, stubConcepts: 0 },
    };
  }

  const checks: QualityCheckResult[] = [];
  const parseCheck = checkYamlParses(raw);
  checks.push(parseCheck);

  if (!parseCheck.passed) {
    return {
      passed: false,
      score: '0/10',
      failures: checks.filter((c) => !c.passed),
      warnings: [],
      stats: { concepts: 0, kps: 0, problems: 0, authoredConcepts: 0, stubConcepts: 0 },
    };
  }

  const data = CourseYamlSchema.parse(raw);

  const authoredConcepts = data.concepts.filter((c) => c.knowledgePoints.length > 0);
  const stubConcepts = data.concepts.filter((c) => c.knowledgePoints.length === 0);
  const kps = data.concepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
  const problems = data.concepts.reduce(
    (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
    0,
  );

  const stats = {
    concepts: data.concepts.length,
    kps,
    problems,
    authoredConcepts: authoredConcepts.length,
    stubConcepts: stubConcepts.length,
  };

  checks.push(checkUniqueProblemIds(data));
  checks.push(checkPrerequisitesValid(data));
  checks.push(checkQuestionDeduplication(data));
  checks.push(checkDifficultyStaircase(data));
  checks.push(checkCrossConceptCoverage(data));
  checks.push(checkProblemVariantDepth(data));
  checks.push(checkInstructionFormatting(data));
  checks.push(checkWorkedExampleCoverage(data));
  checks.push(checkImportDryRun(data));

  const passedCount = checks.filter((c) => c.passed).length;
  const failures = checks.filter((c) => !c.passed);

  return {
    passed: failures.length === 0,
    score: `${passedCount}/10`,
    failures,
    warnings: [],
    stats,
  };
}

// ─── Describe helper (mirrors packages/cli/src/commands/describe.ts) ────────

function computeGraphDepth(concepts: CourseYaml['concepts']): number {
  const graph = new Map<string, string[]>();
  for (const c of concepts) {
    graph.set(c.id, c.prerequisites);
  }

  const memo = new Map<string, number>();

  function depth(id: string, visited: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const prereqs = graph.get(id) ?? [];
    let maxPrereqDepth = 0;
    for (const prereq of prereqs) {
      if (graph.has(prereq)) {
        maxPrereqDepth = Math.max(maxPrereqDepth, depth(prereq, visited));
      }
    }

    const d = maxPrereqDepth + 1;
    memo.set(id, d);
    return d;
  }

  let maxDepth = 0;
  for (const c of concepts) {
    maxDepth = Math.max(maxDepth, depth(c.id, new Set()));
  }
  return maxDepth;
}

function describeCourse(yamlStr: string): Record<string, unknown> {
  const raw = yaml.load(yamlStr);
  const result = CourseYamlSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid course YAML: ${result.error.issues[0]?.message ?? 'unknown error'}`);
  }

  const data = result.data;
  const concepts = data.concepts;
  const sections = data.sections;

  const authoredConcepts = concepts.filter((c) => c.knowledgePoints.length > 0);
  const stubConcepts = concepts.filter((c) => c.knowledgePoints.length === 0);

  const kpCount = concepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
  const problemCount = concepts.reduce(
    (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
    0,
  );

  const graphDepth = computeGraphDepth(concepts);

  const conceptsWithoutKps = stubConcepts.map((c) => c.id);
  const kpsWithoutProblems: string[] = [];
  for (const c of concepts) {
    for (const kp of c.knowledgePoints) {
      if (kp.problems.length === 0) {
        kpsWithoutProblems.push(`${c.id}/${kp.id}`);
      }
    }
  }

  const sectionBreakdown: Array<{ section: string; concepts: number; kps: number; problems: number }> = [];
  if (sections.length > 0) {
    for (const section of sections) {
      const sectionConcepts = concepts.filter((c) => c.section === section.id);
      const sKps = sectionConcepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
      const sProblems = sectionConcepts.reduce(
        (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
        0,
      );
      sectionBreakdown.push({ section: section.id, concepts: sectionConcepts.length, kps: sKps, problems: sProblems });
    }

    const unsectioned = concepts.filter((c) => !c.section);
    if (unsectioned.length > 0) {
      const uKps = unsectioned.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
      const uProblems = unsectioned.reduce(
        (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
        0,
      );
      sectionBreakdown.push({ section: '(unsectioned)', concepts: unsectioned.length, kps: uKps, problems: uProblems });
    }
  }

  return {
    courseName: data.course.name,
    courseId: data.course.id,
    version: data.course.version,
    estimatedHours: data.course.estimatedHours,
    concepts: concepts.length,
    authoredConcepts: authoredConcepts.length,
    stubConcepts: stubConcepts.length,
    knowledgePoints: kpCount,
    problems: problemCount,
    graphDepth,
    conceptsWithoutKps: conceptsWithoutKps.length,
    conceptsWithoutKpsList: conceptsWithoutKps,
    kpsWithoutProblems: kpsWithoutProblems.length,
    kpsWithoutProblemsList: kpsWithoutProblems,
    sections: sectionBreakdown,
  };
}

// ─── Fill concept helper (mirrors packages/cli/src/commands/fill-concept.ts) ─

function fillConcept(yamlStr: string, conceptId: string, options: { kps?: number; problemsPerKp?: number }): string {
  const raw = yaml.load(yamlStr);
  const parsed = CourseYamlSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid course YAML: ${parsed.error.issues[0]?.message ?? 'unknown error'}`);
  }

  const data = parsed.data;
  const concept = data.concepts.find((c) => c.id === conceptId);
  if (!concept) {
    throw new Error(`Concept "${conceptId}" not found. Available: ${data.concepts.map((c) => c.id).join(', ')}`);
  }

  if (concept.knowledgePoints.length > 0) {
    throw new Error(`Concept "${conceptId}" already has ${concept.knowledgePoints.length} KP(s). Remove them first to regenerate.`);
  }

  const kpCount = options.kps ?? 2;
  const problemsPerKp = options.problemsPerKp ?? 3;

  const newKps = [];
  for (let i = 1; i <= kpCount; i++) {
    const problems = [];
    for (let j = 1; j <= problemsPerKp; j++) {
      problems.push({
        id: `${conceptId}-kp${i}-p${j}`,
        type: 'multiple_choice',
        question: `TODO: Write question ${j} for ${conceptId} KP${i}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0,
        explanation: 'TODO: Explain the correct answer',
        difficulty: Math.min(j + 1, 5),
      });
    }

    newKps.push({
      id: `${conceptId}-kp${i}`,
      instruction: `TODO: Write instruction for ${concept.name} — knowledge point ${i}`,
      workedExample: `TODO: Write a worked example for ${concept.name} — knowledge point ${i}`,
      problems,
    });
  }

  // Rebuild the raw object to preserve structure
  const rawObj = raw as Record<string, unknown>;
  const concepts = rawObj['concepts'] as Array<Record<string, unknown>>;
  const targetConcept = concepts.find((c) => c['id'] === conceptId);
  if (targetConcept) {
    targetConcept['knowledgePoints'] = newKps;
  }

  return yaml.dump(rawObj, { lineWidth: 120, noRefs: true });
}

// ─── Tool definitions (JSON Schema) ─────────────────────────────────────────

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
        kps: { type: 'number', description: 'Number of KP stubs to add (default: 2)' },
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
6. cross_concept_coverage — No single term dominates too many concepts
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
    name: 'graspful_import_course',
    description: `Import a course YAML into a Graspful organization. Creates the course as a draft by default.

IMPORTANT: Requires authentication. If not authenticated, call graspful_register first to create an account and get an API key, or set the GRASPFUL_API_KEY environment variable. Without auth, this tool will fail.

If publish=true, the server runs the review gate first — the course must pass all 10 quality checks to be published. If review fails, the course is imported as a draft and failures are returned.

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
    description: `Publish a draft course (sets isPublished = true). The server runs the review gate — course must pass all 10 quality checks.

IMPORTANT: Requires authentication. If not authenticated, call graspful_register first to create an account and get an API key, or set the GRASPFUL_API_KEY environment variable. Without auth, this tool will fail.

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
    description: `Generate a brand YAML scaffold for a white-label learning site. Graspful supports multi-tenant white-labeling — each brand gets its own domain, theme, landing page, and SEO config.

Niche presets: education, healthcare, finance, tech, legal. Each sets appropriate colors, taglines, and copy.

The returned YAML has the full brand structure:
- brand: id, name, domain, tagline, orgSlug
- theme: color preset, border radius
- landing: hero, features, how-it-works, FAQ
- seo: title, description, keywords

Edit the YAML to customize, then import with graspful_import_brand.`,
    inputSchema: {
      type: 'object',
      properties: {
        niche: { type: 'string', description: 'Brand niche: education, healthcare, finance, tech, or legal' },
        name: { type: 'string', description: 'Brand name (default: "{Niche} Academy")' },
        domain: { type: 'string', description: 'Custom domain (default: "{slug}.graspful.ai")' },
        orgSlug: { type: 'string', description: 'Organization slug to associate with' },
      },
      required: ['niche'],
    },
  },
  {
    name: 'graspful_import_brand',
    description: `Import a brand YAML into Graspful. Creates the white-label site configuration.

IMPORTANT: Requires authentication. If not authenticated, call graspful_register first to create an account and get an API key, or set the GRASPFUL_API_KEY environment variable. Without auth, this tool will fail.

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

IMPORTANT: Requires authentication. If not authenticated, call graspful_register first to create an account and get an API key, or set the GRASPFUL_API_KEY environment variable. Without auth, this tool will fail.

Returns an array of courses with their IDs, names, published status, and stats.`,
    inputSchema: {
      type: 'object',
      properties: {
        org: { type: 'string', description: 'Organization slug (e.g., "acme-learning")' },
      },
      required: ['org'],
    },
  },
  {
    name: 'graspful_register',
    description: `Create a new Graspful account and organization. Returns an API key that authenticates all subsequent tool calls.

Call this BEFORE using graspful_import_course, graspful_publish_course, graspful_import_brand, or graspful_list_courses. Those tools require authentication and will fail without it.

You do NOT need to register to use graspful_scaffold_course, graspful_fill_concept, graspful_validate, graspful_review_course, graspful_describe_course, or graspful_create_brand — those work offline.

Returns { userId, orgSlug, apiKey }. The API key is automatically used for subsequent authenticated tool calls in this session.`,
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address for the new account' },
        password: { type: 'string', description: 'Password (min 8 characters)' },
      },
      required: ['email', 'password'],
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
    case 'graspful_scaffold_course': {
      const topic = args.topic as string;
      const estimatedHours = args.estimatedHours as number | undefined;
      const sourceDocument = args.sourceDocument as string | undefined;
      const yamlContent = scaffoldCourse(topic, { hours: estimatedHours, source: sourceDocument });
      return textResult(yamlContent);
    }

    case 'graspful_fill_concept': {
      try {
        const updatedYaml = fillConcept(
          args.yaml as string,
          args.conceptId as string,
          { kps: args.kps as number | undefined, problemsPerKp: args.problemsPerKp as number | undefined },
        );
        return textResult(updatedYaml);
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }

    case 'graspful_validate': {
      const result = validateYaml(args.yaml as string);
      return textResult(JSON.stringify(result, null, 2));
    }

    case 'graspful_review_course': {
      const result = runReview(args.yaml as string);
      return textResult(JSON.stringify(result, null, 2));
    }

    case 'graspful_import_course': {
      try {
        requireApiAuth();
        const result = await apiPost<{ courseId: string; url: string; published: boolean; reviewFailures?: string[] }>(
          `/api/v1/orgs/${args.org}/courses/import`,
          { yaml: args.yaml, publish: args.publish ?? false },
        );
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_publish_course': {
      try {
        requireApiAuth();
        const result = await apiPost<{ courseId: string; published: boolean }>(
          `/api/v1/orgs/${args.org}/courses/${args.courseId}/publish`,
          {},
        );
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Publish failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_describe_course': {
      try {
        const stats = describeCourse(args.yaml as string);
        return textResult(JSON.stringify(stats, null, 2));
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }

    case 'graspful_create_brand': {
      const yamlContent = scaffoldBrand(args.niche as string, {
        name: args.name as string | undefined,
        domain: args.domain as string | undefined,
        orgSlug: args.orgSlug as string | undefined,
      });
      return textResult(yamlContent);
    }

    case 'graspful_import_brand': {
      try {
        requireApiAuth();
        let raw: unknown;
        try {
          raw = yaml.load(args.yaml as string);
        } catch (e) {
          throw new Error(`YAML parse error: ${e instanceof Error ? e.message : String(e)}`);
        }
        // Unwrap YAML structure to flat DTO (brand YAML has nested brand: key)
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
        const result = await apiPost<{ slug: string; domain: string; verificationStatus: string }>(
          '/api/v1/brands',
          dto,
        );
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`Brand import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_list_courses': {
      try {
        requireApiAuth();
        const result = await apiGet<unknown[]>(
          `/api/v1/orgs/${args.org}/courses`,
        );
        return textResult(JSON.stringify(result, null, 2));
      } catch (e) {
        return errorResult(`List failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case 'graspful_register': {
      try {
        const email = args.email as string;
        const password = args.password as string;
        const { baseUrl } = getApiCredentials();

        const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const text = await res.text();
          let message = `Registration failed (${res.status})`;
          try {
            const parsed = JSON.parse(text);
            if (parsed.message) message = parsed.message;
          } catch {
            if (text) message = text;
          }
          return errorResult(message);
        }

        const data = await res.json() as { userId: string; orgSlug: string; apiKey: string };

        // Set the API key in the environment so subsequent tool calls are authenticated
        process.env.GRASPFUL_API_KEY = data.apiKey;

        return textResult(JSON.stringify({
          userId: data.userId,
          orgSlug: data.orgSlug,
          apiKey: data.apiKey,
          message: `Account created. Organization slug: ${data.orgSlug}. API key is now active for this session — you can call graspful_import_course, graspful_publish_course, and other authenticated tools.`,
        }, null, 2));
      } catch (e) {
        return errorResult(`Registration failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

// ─── MCP Server ─────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: 'graspful',
    version: '0.1.0',
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

// ─── Start server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
