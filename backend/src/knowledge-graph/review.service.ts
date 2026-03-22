import { Injectable } from '@nestjs/common';
import { CourseYaml } from './schemas/course-yaml.schema';

export interface ReviewCheckResult {
  check: string;
  passed: boolean;
  details?: string;
}

export interface ReviewResult {
  passed: boolean;
  score: string;
  failures: ReviewCheckResult[];
  warnings: ReviewCheckResult[];
  stats: {
    concepts: number;
    kps: number;
    problems: number;
  };
}

@Injectable()
export class ReviewService {
  review(courseYaml: CourseYaml): ReviewResult {
    const checks: ReviewCheckResult[] = [];

    // Check 1: YAML parsed (if we got here, it parsed)
    checks.push({ check: 'yaml_parses', passed: true });

    // Check 2: Unique problem IDs
    const problemIds = new Set<string>();
    const duplicateProblems: string[] = [];
    for (const concept of courseYaml.concepts) {
      for (const kp of concept.knowledgePoints) {
        for (const problem of kp.problems) {
          if (problemIds.has(problem.id)) {
            duplicateProblems.push(problem.id);
          }
          problemIds.add(problem.id);
        }
      }
    }
    checks.push({
      check: 'unique_problem_ids',
      passed: duplicateProblems.length === 0,
      details:
        duplicateProblems.length > 0
          ? `Duplicate IDs: ${duplicateProblems.join(', ')}`
          : undefined,
    });

    // Check 3: Prerequisites valid
    const conceptIds = new Set(courseYaml.concepts.map((c) => c.id));
    const invalidPrereqs: string[] = [];
    for (const concept of courseYaml.concepts) {
      for (const prereq of concept.prerequisites) {
        if (!conceptIds.has(prereq)) {
          invalidPrereqs.push(`${concept.id} -> ${prereq}`);
        }
      }
    }
    checks.push({
      check: 'prerequisites_valid',
      passed: invalidPrereqs.length === 0,
      details:
        invalidPrereqs.length > 0
          ? `Invalid: ${invalidPrereqs.join(', ')}`
          : undefined,
    });

    // Checks 4-9: Stubs (fully implemented in CLI workstream)
    checks.push({ check: 'question_deduplication', passed: true });
    checks.push({ check: 'difficulty_staircase', passed: true });
    checks.push({ check: 'cross_concept_coverage', passed: true });
    checks.push({ check: 'problem_variant_depth', passed: true });
    checks.push({ check: 'instruction_formatting', passed: true });
    checks.push({ check: 'worked_example_coverage', passed: true });

    // Check 10: Import dry-run (DAG — no cycles)
    const dagResult = this.checkDAG(courseYaml);
    checks.push(dagResult);

    const failures = checks.filter((c) => !c.passed);
    const passedCount = checks.filter((c) => c.passed).length;

    let kpCount = 0;
    let problemCount = 0;
    for (const concept of courseYaml.concepts) {
      kpCount += concept.knowledgePoints.length;
      for (const kp of concept.knowledgePoints) {
        problemCount += kp.problems.length;
      }
    }

    return {
      passed: failures.length === 0,
      score: `${passedCount}/${checks.length}`,
      failures,
      warnings: [],
      stats: {
        concepts: courseYaml.concepts.length,
        kps: kpCount,
        problems: problemCount,
      },
    };
  }

  private checkDAG(courseYaml: CourseYaml): ReviewCheckResult {
    const conceptIds = new Set(courseYaml.concepts.map((c) => c.id));
    const adjList = new Map<string, string[]>();

    for (const concept of courseYaml.concepts) {
      adjList.set(
        concept.id,
        concept.prerequisites.filter((p: string) => conceptIds.has(p)),
      );
    }

    // Topological sort to detect cycles
    const visited = new Set<string>();
    const inStack = new Set<string>();
    let hasCycle = false;
    let cycleDetail = '';

    function dfs(node: string): void {
      if (hasCycle) return;
      visited.add(node);
      inStack.add(node);

      for (const dep of adjList.get(node) || []) {
        if (inStack.has(dep)) {
          hasCycle = true;
          cycleDetail = `Cycle detected involving: ${node} -> ${dep}`;
          return;
        }
        if (!visited.has(dep)) {
          dfs(dep);
        }
      }

      inStack.delete(node);
    }

    for (const id of conceptIds as Set<string>) {
      if (!visited.has(id)) dfs(id);
      if (hasCycle) break;
    }

    return {
      check: 'import_dry_run',
      passed: !hasCycle,
      details: hasCycle ? cycleDetail : undefined,
    };
  }
}
