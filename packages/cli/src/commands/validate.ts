import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { CourseYamlSchema, BrandYamlSchema, AcademyManifestSchema } from '@graspful/shared';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

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

export function registerValidateCommand(program: Command) {
  program
    .command('validate <file>')
    .description('Validate a course, brand, or academy YAML file against its schema')
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
        output(
          { valid: false, errors: [`YAML parse error: ${msg}`], stats: {} },
          `FAIL  YAML parse error: ${msg}`,
        );
        process.exit(1);
      }

      const fileType = detectFileType(raw);
      if (!fileType) {
        output(
          { valid: false, errors: ['Could not detect file type. Expected top-level key: course, brand, or academy'], stats: {} },
          'FAIL  Could not detect file type. Expected top-level key: course, brand, or academy',
        );
        process.exit(1);
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
        output(
          { valid: false, fileType, errors, stats: {} },
          `FAIL  ${fileType} validation (${errors.length} error${errors.length === 1 ? '' : 's'}):\n${errors.map((e) => `  - ${e}`).join('\n')}`,
        );
        process.exit(1);
      }

      // For courses, also check DAG
      const dagErrors: string[] = [];
      let stats: Record<string, unknown> = { fileType };

      if (fileType === 'course') {
        const data = result.data as { concepts: Array<{ id: string; prerequisites: string[]; knowledgePoints: Array<{ problems: unknown[] }> }> };
        const conceptIds = new Set(data.concepts.map((c) => c.id));

        // Check prerequisite references
        for (const concept of data.concepts) {
          for (const prereq of concept.prerequisites) {
            if (!conceptIds.has(prereq)) {
              dagErrors.push(`Concept "${concept.id}" has unknown prerequisite "${prereq}"`);
            }
          }
        }

        // Check for cycles
        const cycles = detectCycles(
          data.concepts.map((c) => ({ id: c.id, prerequisites: c.prerequisites })),
        );
        dagErrors.push(...cycles);

        const kpCount = data.concepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
        const problemCount = data.concepts.reduce(
          (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
          0,
        );

        stats = {
          fileType,
          concepts: data.concepts.length,
          knowledgePoints: kpCount,
          problems: problemCount,
        };
      }

      if (dagErrors.length > 0) {
        output(
          { valid: false, fileType, errors: dagErrors, stats },
          `FAIL  DAG validation (${dagErrors.length} error${dagErrors.length === 1 ? '' : 's'}):\n${dagErrors.map((e) => `  - ${e}`).join('\n')}`,
        );
        process.exit(1);
      }

      cliCapture('course validated', { valid: true, error_count: 0, file_type: fileType });
      output(
        { valid: true, fileType, errors: [], stats },
        `PASS  ${fileType} validation\n${Object.entries(stats).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`,
      );
    });
}
