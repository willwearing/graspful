import { CourseYamlSchema } from './schemas/course-yaml.schema';
import type { CourseYaml } from './schemas/course-yaml.schema';

export interface QualityCheckResult {
  check: string;
  passed: boolean;
  details?: string;
}

export interface QualityGateResult {
  passed: boolean;
  score: string;
  failures: QualityCheckResult[];
  warnings: QualityCheckResult[];
  stats: {
    concepts: number;
    kps: number;
    problems: number;
    authoredConcepts: number;
    stubConcepts: number;
  };
}

export const QUALITY_CHECKS = [
  'yaml_parses',
  'unique_problem_ids',
  'prerequisites_valid',
  'question_deduplication',
  'difficulty_staircase',
  'cross_concept_coverage',
  'problem_variant_depth',
  'instruction_formatting',
  'worked_example_coverage',
  'import_dry_run',
] as const;

export type QualityCheckName = (typeof QUALITY_CHECKS)[number];

function countStats(courseYaml: CourseYaml) {
  const authoredConcepts = courseYaml.concepts.filter(
    (concept) => concept.knowledgePoints.length > 0,
  );
  const stubConcepts = courseYaml.concepts.filter(
    (concept) => concept.knowledgePoints.length === 0,
  );
  const kps = courseYaml.concepts.reduce(
    (sum, concept) => sum + concept.knowledgePoints.length,
    0,
  );
  const problems = courseYaml.concepts.reduce(
    (sum, concept) =>
      sum +
      concept.knowledgePoints.reduce((kpSum, kp) => kpSum + kp.problems.length, 0),
    0,
  );

  return {
    concepts: courseYaml.concepts.length,
    kps,
    problems,
    authoredConcepts: authoredConcepts.length,
    stubConcepts: stubConcepts.length,
  };
}

function checkUniqueProblemIds(courseYaml: CourseYaml): QualityCheckResult {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const concept of courseYaml.concepts) {
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

function checkPrerequisitesValid(courseYaml: CourseYaml): QualityCheckResult {
  const conceptIds = new Set(courseYaml.concepts.map((concept) => concept.id));
  const invalid: string[] = [];

  for (const concept of courseYaml.concepts) {
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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function checkQuestionDeduplication(courseYaml: CourseYaml): QualityCheckResult {
  const seen = new Map<string, { conceptId: string; problemId: string }>();
  const collisions: string[] = [];

  for (const concept of courseYaml.concepts) {
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        const normalized = normalizeText(problem.question);
        const hash = hashText(normalized);
        const key = `${hash}-d${problem.difficulty ?? 'none'}`;

        const existing = seen.get(key);
        if (existing) {
          collisions.push(
            `"${problem.id}" collides with "${existing.problemId}" (same question text at same difficulty)`,
          );
        } else {
          seen.set(key, { conceptId: concept.id, problemId: problem.id });
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
    details:
      collisions.slice(0, 5).join('; ') +
      (collisions.length > 5 ? ` (+${collisions.length - 5} more)` : ''),
  };
}

function extractStems(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 4);
}

function checkCrossConceptCoverage(courseYaml: CourseYaml): QualityCheckResult {
  const stemConceptCount = new Map<string, Set<string>>();

  for (const concept of courseYaml.concepts) {
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        for (const stem of extractStems(problem.question)) {
          if (!stemConceptCount.has(stem)) {
            stemConceptCount.set(stem, new Set());
          }
          stemConceptCount.get(stem)!.add(concept.id);
        }
      }
    }
  }

  const commonWords = new Set([
    'which',
    'would',
    'should',
    'could',
    'about',
    'their',
    'there',
    'these',
    'those',
    'being',
    'between',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'following',
    'statement',
    'answer',
    'question',
    'correct',
    'incorrect',
    'agent',
    'property',
    'owner',
    'buyer',
    'seller',
  ]);

  const overused: string[] = [];
  for (const [stem, concepts] of stemConceptCount) {
    if (concepts.size > 3 && !commonWords.has(stem)) {
      overused.push(`"${stem}" appears across ${concepts.size} concepts`);
    }
  }

  if (overused.length === 0) {
    return { check: 'cross_concept_coverage', passed: true };
  }

  return {
    check: 'cross_concept_coverage',
    passed: overused.length <= 5,
    details:
      overused.slice(0, 5).join('; ') +
      (overused.length > 5 ? ` (+${overused.length - 5} more)` : ''),
  };
}

function checkDifficultyStaircase(courseYaml: CourseYaml): QualityCheckResult {
  const failures: string[] = [];

  for (const concept of courseYaml.concepts) {
    if (concept.knowledgePoints.length === 0) {
      continue;
    }

    const difficulties = new Set<number>();
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        if (problem.difficulty != null) {
          difficulties.add(problem.difficulty);
        }
      }
    }

    if (difficulties.size > 0 && difficulties.size < 2) {
      failures.push(
        `"${concept.id}" has problems at only ${difficulties.size} difficulty level(s) - need 2+`,
      );
    }
  }

  if (failures.length === 0) {
    return { check: 'difficulty_staircase', passed: true };
  }

  return {
    check: 'difficulty_staircase',
    passed: false,
    details:
      failures.slice(0, 5).join('; ') +
      (failures.length > 5 ? ` (+${failures.length - 5} more)` : ''),
  };
}

function checkProblemVariantDepth(courseYaml: CourseYaml): QualityCheckResult {
  const failures: string[] = [];

  for (const concept of courseYaml.concepts) {
    if (concept.knowledgePoints.length === 0) {
      continue;
    }

    for (const kp of concept.knowledgePoints) {
      if (kp.problems.length < 3) {
        failures.push(`"${concept.id}/${kp.id}" has ${kp.problems.length} problem(s) - need 3+`);
      }
    }
  }

  if (failures.length === 0) {
    return { check: 'problem_variant_depth', passed: true };
  }

  return {
    check: 'problem_variant_depth',
    passed: false,
    details:
      failures.slice(0, 5).join('; ') +
      (failures.length > 5 ? ` (+${failures.length - 5} more)` : ''),
  };
}

function checkInstructionFormatting(courseYaml: CourseYaml): QualityCheckResult {
  const warnings: string[] = [];

  for (const concept of courseYaml.concepts) {
    for (const kp of concept.knowledgePoints) {
      if (!kp.instruction) {
        continue;
      }

      if (kp.instruction.match(/^[\w\-./]+\.(md|txt|html)$/)) {
        continue;
      }

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
    details:
      warnings.slice(0, 5).join('; ') +
      (warnings.length > 5 ? ` (+${warnings.length - 5} more)` : ''),
  };
}

function checkWorkedExampleCoverage(courseYaml: CourseYaml): QualityCheckResult {
  const authoredConcepts = courseYaml.concepts.filter(
    (concept) => concept.knowledgePoints.length > 0,
  );

  if (authoredConcepts.length === 0) {
    return { check: 'worked_example_coverage', passed: true };
  }

  const withExamples = authoredConcepts.filter((concept) =>
    concept.knowledgePoints.some(
      (kp) => kp.workedExample && kp.workedExample.trim().length > 0,
    ),
  );

  const coverage = withExamples.length / authoredConcepts.length;
  if (coverage >= 0.5) {
    return { check: 'worked_example_coverage', passed: true };
  }

  return {
    check: 'worked_example_coverage',
    passed: false,
    details: `${withExamples.length}/${authoredConcepts.length} authored concepts have worked examples (${Math.round(coverage * 100)}%) - need 50%+`,
  };
}

function checkImportDryRun(courseYaml: CourseYaml): QualityCheckResult {
  const conceptIds = new Set(courseYaml.concepts.map((concept) => concept.id));
  const errors: string[] = [];

  for (const concept of courseYaml.concepts) {
    for (const prereq of concept.prerequisites) {
      if (!conceptIds.has(prereq)) {
        errors.push(`Unknown prerequisite: ${concept.id} -> ${prereq}`);
      }
    }
  }

  const graph = new Map<string, string[]>();
  for (const concept of courseYaml.concepts) {
    graph.set(concept.id, [...concept.prerequisites]);
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

    if (visited.has(node)) {
      return false;
    }

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

function summarizeChecks(checks: QualityCheckResult[]): Omit<QualityGateResult, 'stats'> {
  const passedCount = checks.filter((check) => check.passed).length;
  const failures = checks.filter((check) => !check.passed);

  return {
    passed: failures.length === 0,
    score: `${passedCount}/${QUALITY_CHECKS.length}`,
    failures,
    warnings: [],
  };
}

export function reviewCourseYaml(courseYaml: CourseYaml): QualityGateResult {
  const stats = countStats(courseYaml);
  const checks: QualityCheckResult[] = [
    { check: 'yaml_parses', passed: true },
    checkUniqueProblemIds(courseYaml),
    checkPrerequisitesValid(courseYaml),
    checkQuestionDeduplication(courseYaml),
    checkDifficultyStaircase(courseYaml),
    checkCrossConceptCoverage(courseYaml),
    checkProblemVariantDepth(courseYaml),
    checkInstructionFormatting(courseYaml),
    checkWorkedExampleCoverage(courseYaml),
    checkImportDryRun(courseYaml),
  ];

  return {
    ...summarizeChecks(checks),
    stats,
  };
}

export function runQualityGate(raw: unknown): QualityGateResult {
  const result = CourseYamlSchema.safeParse(raw);

  if (!result.success) {
    return {
      passed: false,
      score: '0/10',
      failures: [
        {
          check: 'yaml_parses',
          passed: false,
          details: result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; '),
        },
      ],
      warnings: [],
      stats: {
        concepts: 0,
        kps: 0,
        problems: 0,
        authoredConcepts: 0,
        stubConcepts: 0,
      },
    };
  }

  return reviewCourseYaml(result.data);
}
