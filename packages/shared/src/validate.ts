import { CourseYamlSchema } from './schemas/course-yaml.schema';
import { BrandYamlSchema } from './schemas/brand-yaml.schema';
import { AcademyManifestSchema } from './schemas/academy-manifest.schema';

export type FileType = 'course' | 'brand' | 'academy';

export interface ValidationResult {
  valid: boolean;
  fileType?: string;
  errors: string[];
  stats: Record<string, unknown>;
}

export function detectFileType(data: unknown): FileType | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if ('course' in obj) return 'course';
  if ('brand' in obj) return 'brand';
  if ('academy' in obj) return 'academy';
  return null;
}

export function detectCycles(concepts: Array<{ id: string; prerequisites: string[] }>): string[] {
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

const SCHEMA_MAP = {
  course: CourseYamlSchema,
  brand: BrandYamlSchema,
  academy: AcademyManifestSchema,
} as const;

export function validateParsedYaml(raw: unknown): ValidationResult {
  const fileType = detectFileType(raw);
  if (!fileType) {
    return { valid: false, errors: ['Could not detect file type. Expected top-level key: course, brand, or academy'], stats: {} };
  }

  const result = SCHEMA_MAP[fileType].safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    );
    return { valid: false, fileType, errors, stats: {} };
  }

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
