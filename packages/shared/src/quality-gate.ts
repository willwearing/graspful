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

export const QUALITY_CHECK_METADATA = [
  {
    name: 'yaml_parses',
    description: 'Course structure and problem answers match the shared schema.',
    fix: 'Fix schema errors. Choice answers use valid zero-based indices; other types must match their answer contract.',
  },
  {
    name: 'unique_problem_ids',
    description: 'Every problem has a unique ID across the course.',
    fix: 'Use a distinct concept, knowledge point, and problem prefix for each problem ID.',
  },
  {
    name: 'publication_readiness',
    description: 'Every concept has teaching content. Names, questions, answers, and teaching contain no known scaffold markers.',
    fix: 'Author each concept, add at least five words of teaching per knowledge point in instruction or callout content, and replace placeholder text. Draft scaffolds can still validate.',
  },
  {
    name: 'question_deduplication',
    description: 'Questions at the same difficulty have distinct normalized text.',
    fix: 'Write distinct problem variants instead of repeating the same question at the same difficulty.',
  },
  {
    name: 'difficulty_staircase',
    description: 'Each concept has problems at two or more difficulty levels.',
    fix: 'Include easier and harder problems. Problems without a difficulty use the import default of 3.',
  },
  {
    name: 'problem_teaching_alignment',
    description: 'A vocabulary check flags knowledge points whose questions all appear unrelated to the teaching path.',
    fix: 'Teach the material tested by the questions in this knowledge point, earlier knowledge points, or its prerequisites. Check factual and teaching accuracy against your sources separately.',
  },
  {
    name: 'problem_variant_depth',
    description: 'Each knowledge point has at least three problems.',
    fix: 'Add at least three answerable problem variants for each knowledge point.',
  },
  {
    name: 'instruction_formatting',
    description: 'Instructions longer than 100 words include content blocks.',
    fix: 'Split long prose into smaller knowledge points or add useful content blocks.',
  },
  {
    name: 'worked_example_coverage',
    description: 'At least half of authored concepts include a worked example.',
    fix: 'Add a worked example, in text or content blocks, to at least half of the authored concepts.',
  },
  {
    name: 'import_dry_run',
    description: 'Concept and knowledge point IDs are unique in their scopes, and prerequisites exist without cycles.',
    fix: 'Resolve duplicate IDs, unknown prerequisite references, and prerequisite cycles.',
  },
] as const;

export const QUALITY_CHECKS = QUALITY_CHECK_METADATA.map((check) => check.name);

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

// This floor catches incomplete lessons. It does not certify factual accuracy
// or replace a subject expert's review of the source material.
const MIN_INSTRUCTION_WORDS = 5;
const PLACEHOLDER_LINE = /(?:^|\n)\s*(?:(?:TODO|TBD|FIXME)(?:\s*:|\s*$)|(?:stub|placeholder)\s+(?:instruction|example|question|content|answer)\b|lorem ipsum\b|(?:write|add|insert|replace)\s+(?:your|the)\s+(?:instruction|example|question|content|answer)\s+here\b)/i;
const UNRESOLVED_CONTENT_FILE = /^\s*[^\s<>]+\.(?:md|txt|html)\s*$/i;

function hasPlaceholder(value: string | undefined): boolean {
  return Boolean(value && (PLACEHOLDER_LINE.test(value) || /^\s*Option\s+[A-Z0-9]\s*$/i.test(value)));
}

function contentBlockText(block: CourseYaml['concepts'][number]['knowledgePoints'][number]['instructionContent'][number]): string[] {
  switch (block.type) {
    case 'callout': return [block.title, block.body];
    case 'image': return [block.alt, block.caption ?? ''];
    case 'video': return [block.title, block.caption ?? ''];
    case 'link': return [block.title, block.description ?? ''];
  }
}

function checkPublicationReadiness(courseYaml: CourseYaml): QualityCheckResult {
  const failures: string[] = [];
  const inspect = (label: string, value: string | undefined, required = false) => {
    if (required && !value?.trim()) failures.push(`${label} is empty`);
    else if (hasPlaceholder(value)) failures.push(`${label} contains placeholder text`);
  };

  inspect('Course name', courseYaml.course.name, true);
  inspect('Course description', courseYaml.course.description);
  inspect('Course source document', courseYaml.course.sourceDocument);
  if (courseYaml.concepts.length === 0) failures.push('Course needs at least one authored concept');
  for (const section of courseYaml.sections) {
    inspect(`Section "${section.id}" name`, section.name, true);
    inspect(`Section "${section.id}" description`, section.description);
  }

  for (const concept of courseYaml.concepts) {
    inspect(`Concept "${concept.id}" name`, concept.name, true);
    inspect(`Concept "${concept.id}" source`, concept.sourceRef);
    if (concept.knowledgePoints.length === 0) failures.push(`"${concept.id}" has no authored knowledge points`);
    for (const kp of concept.knowledgePoints) {
      const label = `"${concept.id}/${kp.id}"`;
      inspect(`${label} instruction`, kp.instruction);
      inspect(`${label} worked example`, kp.workedExample);
      for (const [field, value] of [['instruction', kp.instruction], ['worked example', kp.workedExample]]) {
        if (value && UNRESOLVED_CONTENT_FILE.test(value)) {
          failures.push(`${label} ${field} is a file reference; include its teaching text directly before publication`);
        }
      }
      const teachingText = [kp.instruction ?? '', ...kp.instructionContent
        .filter((block) => block.type === 'callout')
        .map((block) => block.body)].join(' ');
      if (teachingText.trim().split(/\s+/).filter(Boolean).length < MIN_INSTRUCTION_WORDS) {
        failures.push(`${label} needs teaching text of at least ${MIN_INSTRUCTION_WORDS} words in instruction or callout content`);
      }
      for (const block of [...kp.instructionContent, ...kp.workedExampleContent]) {
        for (const value of contentBlockText(block)) inspect(`${label} content block`, value);
      }
      for (const problem of kp.problems) {
        inspect(`Problem "${problem.id}" question`, problem.question, true);
        inspect(`Problem "${problem.id}" explanation`, problem.explanation);
        for (const option of problem.options ?? []) inspect(`Problem "${problem.id}" option`, option);
        const answerTexts = typeof problem.correct === 'string' ? [problem.correct] :
          Array.isArray(problem.correct) ? problem.correct.flat() :
          typeof problem.correct === 'object' && problem.correct !== null ? Object.values(problem.correct).flat() : [];
        for (const value of answerTexts) inspect(`Problem "${problem.id}" answer`, value);
      }
    }
  }

  return {
    check: 'publication_readiness',
    passed: failures.length === 0,
    ...(failures.length > 0 && { details: failures.slice(0, 8).join('; ') +
      (failures.length > 8 ? ` (+${failures.length - 8} more)` : '') }),
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

function addStems(target: Set<string>, value: string | undefined) {
  if (!value) {
    return;
  }

  for (const stem of extractStems(value)) {
    target.add(stem);
  }
}

function buildConceptIndex(courseYaml: CourseYaml) {
  return new Map(courseYaml.concepts.map((concept) => [concept.id, concept]));
}

function collectAllowedProblemStems(
  conceptIndex: Map<string, CourseYaml['concepts'][number]>,
  concept: CourseYaml['concepts'][number],
  kpIndex: number,
) {
  const allowed = new Set<string>();

  addStems(allowed, concept.name);
  for (const tag of concept.tags) {
    addStems(allowed, tag);
  }

  for (const prereqId of concept.prerequisites) {
    const prereq = conceptIndex.get(prereqId);
    if (!prereq) {
      continue;
    }
    addStems(allowed, prereq.name);
    for (const tag of prereq.tags) {
      addStems(allowed, tag);
    }
    for (const prereqKp of prereq.knowledgePoints) {
      addStems(allowed, prereqKp.instruction);
      addStems(allowed, prereqKp.workedExample);
      for (const block of [...prereqKp.instructionContent, ...prereqKp.workedExampleContent]) {
        for (const text of contentBlockText(block)) addStems(allowed, text);
      }
    }
  }

  for (let index = 0; index <= kpIndex; index++) {
    const kp = concept.knowledgePoints[index];
    addStems(allowed, kp?.instruction);
    addStems(allowed, kp?.workedExample);
    for (const block of [...kp.instructionContent, ...kp.workedExampleContent]) {
      for (const text of contentBlockText(block)) addStems(allowed, text);
    }
  }

  return allowed;
}

// Words that are too generic to count as evidence that a problem is on-topic.
const ALIGNMENT_IGNORED_WORDS = new Set([
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
  'client',
  'server',
  'resource',
  'resources',
]);

// Minimum distinct teaching stems we need before we can judge alignment at all.
// Below this, vocabulary overlap cannot reliably judge alignment. The separate
// publication_readiness check rejects incomplete teaching.
const MIN_TEACHING_STEMS_FOR_ALIGNMENT = 8;

function checkProblemTeachingAlignment(courseYaml: CourseYaml): QualityCheckResult {
  const conceptIndex = buildConceptIndex(courseYaml);
  const failures: string[] = [];

  for (const concept of courseYaml.concepts) {
    for (let kpIndex = 0; kpIndex < concept.knowledgePoints.length; kpIndex++) {
      const kp = concept.knowledgePoints[kpIndex];
      const allowed = collectAllowedProblemStems(conceptIndex, concept, kpIndex);

      // A short teaching path has too little vocabulary for this heuristic.
      if (allowed.size < MIN_TEACHING_STEMS_FOR_ALIGNMENT) {
        continue;
      }

      let judgedProblems = 0;
      let alignedProblems = 0;

      for (const problem of kp.problems) {
        const significantQuestionStems = extractStems(problem.question).filter(
          (stem) => !ALIGNMENT_IGNORED_WORDS.has(stem),
        );

        // Short or stop-word-only questions cannot be judged by overlap.
        if (significantQuestionStems.length === 0) {
          continue;
        }

        judgedProblems += 1;

        const hasOverlap = significantQuestionStems.some((stem) => allowed.has(stem));
        if (hasOverlap) {
          alignedProblems += 1;
        }
      }

      // Only fail the KP when EVERY judgable problem is off-topic. A single
      // lexically drifted problem in an otherwise aligned KP is not enough to
      // block publish — that is a content-author nit, not a gate violation.
      if (judgedProblems > 0 && alignedProblems === 0) {
        failures.push(
          `"${concept.id}/${kp.id}" has ${judgedProblems} problem(s) that share no vocabulary with the KP's instruction, worked example, earlier KPs, or prerequisite concepts`,
        );
      }
    }
  }

  if (failures.length === 0) {
    return { check: 'problem_teaching_alignment', passed: true };
  }

  return {
    check: 'problem_teaching_alignment',
    passed: false,
    details:
      failures.slice(0, 5).join('; ') +
      (failures.length > 5 ? ` (+${failures.length - 5} more)` : ''),
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
        difficulties.add(problem.difficulty ?? 3);
      }
    }

    if (difficulties.size < 2) {
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
      (kp) => Boolean(kp.workedExample?.trim()) || kp.workedExampleContent.length > 0,
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

  const seenConcepts = new Set<string>();
  for (const concept of courseYaml.concepts) {
    if (seenConcepts.has(concept.id)) errors.push(`Duplicate concept ID: ${concept.id}`);
    seenConcepts.add(concept.id);
    const kpIds = new Set<string>();
    for (const kp of concept.knowledgePoints) {
      if (kpIds.has(kp.id)) errors.push(`Duplicate knowledge point ID: ${concept.id}/${kp.id}`);
      kpIds.add(kp.id);
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

/**
 * Slice 3 — every authored KP should link to a key-prerequisite concept
 * so that KP-level plateau can trigger targeted remediation (Math Academy
 * Way, Ch 4 p.76 + Ch 21 pp.300–301).
 *
 * We emit these as WARNINGS (not 10/10 failures) during the backfill
 * window so existing courses keep passing the quality gate while authors
 * add the links. Invalid (unknown-concept) links are also warnings —
 * the import path validates them against the authored graph already.
 *
 * Once every course in the catalog has been backfilled, raise this to
 * a hard failure and expand `QUALITY_CHECKS` to `key_prerequisite_links`.
 */
function collectKeyPrerequisiteWarnings(
  courseYaml: CourseYaml,
): QualityCheckResult[] {
  const conceptIds = new Set(courseYaml.concepts.map((c) => c.id));
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const concept of courseYaml.concepts) {
    for (const kp of concept.knowledgePoints) {
      if (!kp.keyPrerequisite) {
        missing.push(`${concept.id}.${kp.id}`);
      } else if (!conceptIds.has(kp.keyPrerequisite)) {
        invalid.push(
          `${concept.id}.${kp.id} -> ${kp.keyPrerequisite} (unknown concept)`,
        );
      }
    }
  }

  const warnings: QualityCheckResult[] = [];
  if (missing.length > 0) {
    warnings.push({
      check: 'key_prerequisite_links',
      passed: false,
      details: `${missing.length} KP(s) missing key prerequisite (warning during backfill): ${missing
        .slice(0, 5)
        .join(', ')}${missing.length > 5 ? '...' : ''}`,
    });
  }
  if (invalid.length > 0) {
    warnings.push({
      check: 'key_prerequisite_links',
      passed: false,
      details: `Invalid key prerequisite link: ${invalid.join('; ')}`,
    });
  }
  return warnings;
}

const KP_ATOMICITY_BULLET_THRESHOLD = 6;

function collectKpAtomicityWarnings(courseYaml: CourseYaml): QualityCheckResult[] {
  const warnings: QualityCheckResult[] = [];

  for (const concept of courseYaml.concepts) {
    for (const kp of concept.knowledgePoints) {
      if (!kp.instruction) {
        continue;
      }

      const lines = kp.instruction.split('\n');
      let runLength = 0;
      let maxRun = 0;
      for (const line of lines) {
        const isListItem = /^\s*(?:[-*•]|\d+\.)\s+\S/.test(line);
        const isBlank = line.trim().length === 0;
        if (isListItem) {
          runLength += 1;
          if (runLength > maxRun) maxRun = runLength;
        } else if (!isBlank) {
          runLength = 0;
        }
      }

      if (maxRun >= KP_ATOMICITY_BULLET_THRESHOLD) {
        warnings.push({
          check: 'kp_atomicity',
          passed: false,
          details: `"${concept.id}/${kp.id}" instruction has a parallel list of ${maxRun} items — likely teaches multiple facts at once. Consider splitting into separate knowledge points so each KP teaches one load-bearing idea (The Math Academy Way, Ch. 14).`,
        });
      }
    }
  }

  return warnings;
}

function summarizeChecks(
  checks: QualityCheckResult[],
  warnings: QualityCheckResult[],
): Omit<QualityGateResult, 'stats'> {
  const passedCount = checks.filter((check) => check.passed).length;
  const failures = checks.filter((check) => !check.passed);

  return {
    passed: failures.length === 0,
    score: `${passedCount}/${QUALITY_CHECKS.length}`,
    failures,
    warnings,
  };
}

function reviewParsedCourseYaml(courseYaml: CourseYaml): QualityGateResult {
  const stats = countStats(courseYaml);
  const checks: QualityCheckResult[] = [
    { check: 'yaml_parses', passed: true },
    checkUniqueProblemIds(courseYaml),
    checkPublicationReadiness(courseYaml),
    checkQuestionDeduplication(courseYaml),
    checkDifficultyStaircase(courseYaml),
    checkProblemTeachingAlignment(courseYaml),
    checkProblemVariantDepth(courseYaml),
    checkInstructionFormatting(courseYaml),
    checkWorkedExampleCoverage(courseYaml),
    checkImportDryRun(courseYaml),
  ];
  const warnings = [
    ...collectKpAtomicityWarnings(courseYaml),
    ...collectKeyPrerequisiteWarnings(courseYaml),
  ];

  return {
    ...summarizeChecks(checks, warnings),
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

  return reviewParsedCourseYaml(result.data);
}

// Revalidate typed inputs too: database exports and direct service callers must
// receive the same publication checks as raw CLI and MCP input.
export function reviewCourseYaml(courseYaml: CourseYaml): QualityGateResult {
  return runQualityGate(courseYaml);
}
