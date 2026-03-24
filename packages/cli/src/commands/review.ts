import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import { CourseYamlSchema } from '@graspful/shared';
import type { CourseYaml, QualityCheckResult, QualityGateResult } from '@graspful/shared';
import { output, outputError } from '../lib/output';

// ─── Check 1: yaml_parses ───────────────────────────────────────────────────
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

// ─── Check 2: unique_problem_ids ────────────────────────────────────────────
function checkUniqueProblemIds(data: CourseYaml): QualityCheckResult {
  const allIds: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const concept of data.concepts) {
    for (const kp of concept.knowledgePoints) {
      for (const problem of kp.problems) {
        allIds.push(problem.id);
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

// ─── Check 3: prerequisites_valid ───────────────────────────────────────────
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

// ─── Check 4: question_deduplication ────────────────────────────────────────
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkQuestionDeduplication(data: CourseYaml): QualityCheckResult {
  const seen = new Map<string, { conceptId: string; problemId: string; difficulty?: number }>();
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
          seen.set(key, { conceptId: concept.id, problemId: problem.id, difficulty: problem.difficulty });
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

// ─── Check 5: difficulty_staircase ──────────────────────────────────────────
function checkDifficultyStaircase(data: CourseYaml): QualityCheckResult {
  const failures: string[] = [];

  for (const concept of data.concepts) {
    if (concept.knowledgePoints.length === 0) continue; // skip stubs

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

// ─── Check 6: cross_concept_coverage ────────────────────────────────────────
function extractStems(text: string): string[] {
  // Simple word extraction — split on whitespace, lowercase, strip punctuation, filter short words
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);
}

function checkCrossConceptCoverage(data: CourseYaml): QualityCheckResult {
  // Count how many concepts each "fact stem" appears in
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

  // This is a warning-level check; only fail if there are egregious overlaps
  // Filter to only meaningful stems (not common English words)
  const commonWords = new Set([
    'which', 'would', 'should', 'could', 'about', 'their', 'there', 'these', 'those',
    'being', 'between', 'through', 'during', 'before', 'after', 'above', 'below',
    'following', 'statement', 'answer', 'question', 'correct', 'incorrect',
    'agent', 'property', 'owner', 'buyer', 'seller', // domain-common, expected overlap
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
    passed: meaningfulOverused.length <= 5, // warn but pass if only a few
    details: meaningfulOverused.slice(0, 5).join('; ') + (meaningfulOverused.length > 5 ? ` (+${meaningfulOverused.length - 5} more)` : ''),
  };
}

// ─── Check 7: problem_variant_depth ─────────────────────────────────────────
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

// ─── Check 8: instruction_formatting ────────────────────────────────────────
function checkInstructionFormatting(data: CourseYaml): QualityCheckResult {
  const warnings: string[] = [];

  for (const concept of data.concepts) {
    for (const kp of concept.knowledgePoints) {
      if (!kp.instruction) continue;

      // If instruction is a file reference (path), skip word count check
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

// ─── Check 9: worked_example_coverage ───────────────────────────────────────
function checkWorkedExampleCoverage(data: CourseYaml): QualityCheckResult {
  const authoredConcepts = data.concepts.filter((c) => c.knowledgePoints.length > 0);
  if (authoredConcepts.length === 0) {
    return { check: 'worked_example_coverage', passed: true };
  }

  const withExamples = authoredConcepts.filter((c) =>
    c.knowledgePoints.some((kp) => kp.workedExample && kp.workedExample.trim().length > 0),
  );

  const coverage = withExamples.length / authoredConcepts.length;
  const passed = coverage >= 0.5;

  if (passed) {
    return { check: 'worked_example_coverage', passed: true };
  }
  return {
    check: 'worked_example_coverage',
    passed: false,
    details: `${withExamples.length}/${authoredConcepts.length} authored concepts have worked examples (${Math.round(coverage * 100)}%) — need 50%+`,
  };
}

// ─── Check 10: import_dry_run (DAG validation) ─────────────────────────────
function checkImportDryRun(data: CourseYaml): QualityCheckResult {
  const conceptIds = new Set(data.concepts.map((c) => c.id));
  const errors: string[] = [];

  // Check references
  for (const concept of data.concepts) {
    for (const prereq of concept.prerequisites) {
      if (!conceptIds.has(prereq)) {
        errors.push(`Unknown prerequisite: ${concept.id} -> ${prereq}`);
      }
    }
  }

  // Check for cycles
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

// ─── Main review orchestrator ───────────────────────────────────────────────
function runReview(raw: unknown): QualityGateResult {
  const checks: QualityCheckResult[] = [];

  // Check 1: yaml_parses
  const parseCheck = checkYamlParses(raw);
  checks.push(parseCheck);

  if (!parseCheck.passed) {
    // Can't run remaining checks if YAML doesn't parse
    return {
      passed: false,
      score: '0/10',
      failures: checks.filter((c) => !c.passed),
      warnings: [],
      stats: { concepts: 0, kps: 0, problems: 0, authoredConcepts: 0, stubConcepts: 0 },
    };
  }

  const data = CourseYamlSchema.parse(raw);

  // Compute stats
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

  // Checks 2-10
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
    warnings: [], // Could separate warnings from hard failures in future
    stats,
  };
}

export function registerReviewCommand(program: Command) {
  program
    .command('review <file>')
    .description('Run all 10 mechanical quality checks on a course YAML')
    .action(async (file: string) => {
      if (!fs.existsSync(file)) {
        outputError(`File not found: ${file}`);
        process.exit(1);
      }

      let raw: unknown;
      try {
        raw = yaml.load(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`YAML parse error: ${msg}`);
        process.exit(1);
      }

      const result = runReview(raw);

      const lines = [
        result.passed ? 'PASS' : 'FAIL',
        `Score: ${result.score}`,
        `Stats: ${result.stats.concepts} concepts (${result.stats.authoredConcepts} authored, ${result.stats.stubConcepts} stubs), ${result.stats.kps} KPs, ${result.stats.problems} problems`,
      ];

      if (result.failures.length > 0) {
        lines.push('');
        lines.push('Failures:');
        for (const f of result.failures) {
          lines.push(`  [FAIL] ${f.check}: ${f.details ?? 'no details'}`);
        }
      }

      output(result, lines.join('\n'));

      if (!result.passed) {
        process.exit(1);
      }
    });
}
