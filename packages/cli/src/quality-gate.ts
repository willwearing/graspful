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
