import { z } from 'zod';

const ContentBlockYamlSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    url: z.string().min(1),
    alt: z.string().min(1),
    caption: z.string().optional(),
    width: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('video'),
    url: z.string().min(1),
    title: z.string().min(1),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal('link'),
    url: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('callout'),
    title: z.string().min(1),
    body: z.string().min(1),
  }),
]);

// Drafts may omit teaching content, but any supplied problem must be answerable
// by the learner controls and assessment evaluator.
const ScalarAnswerSchema = z.union([z.string(), z.number().finite()]);
const CorrectAnswerSchema = z.union([
  ScalarAnswerSchema,
  z.boolean(),
  z.array(z.string()),
  z.array(z.tuple([z.string(), z.string()])),
  z.record(z.string()),
  z.object({ answer: z.string(), alternatives: z.array(z.string()).optional() }),
]);

type CorrectAnswer = z.infer<typeof CorrectAnswerSchema>;

function parseIndexOrder(value: string, optionCount: number): number[] | null {
  const parts = value.split(',').map((part) => part.trim());
  if (parts.some((part) => !/^(0|[1-9]\d*)$/.test(part))) return null;
  const indices = parts.map(Number);
  if (
    indices.length !== optionCount ||
    new Set(indices).size !== optionCount ||
    indices.some((index) => index < 0 || index >= optionCount)
  ) return null;
  return indices;
}

function matchingAnswerMap(value: CorrectAnswer): Record<string, string> | null {
  if (Array.isArray(value)) {
    if (!value.every((pair) => Array.isArray(pair) && pair.length === 2)) return null;
    const pairs = value as Array<[string, string]>;
    if (new Set(pairs.map(([left]) => left)).size !== pairs.length) return null;
    return Object.fromEntries(pairs);
  }
  if (typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'string')) {
    return value as Record<string, string>;
  }
  return null;
}

const ProblemYamlSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum([
    'multiple_choice',
    'fill_blank',
    'true_false',
    'ordering',
    'matching',
    'scenario',
  ]),
  question: z.string(),
  options: z.array(z.preprocess(
    (value) => value == null ? 'null' : ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : value,
    z.string().refine((value) => value.trim().length > 0, 'Options must contain text'),
  )).optional(),
  correct: CorrectAnswerSchema,
  explanation: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
}).superRefine((problem, ctx) => {
  const invalid = (path: 'correct' | 'options', message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  const options = problem.options ?? [];
  const correct = problem.correct;

  if (['multiple_choice', 'scenario', 'ordering', 'matching'].includes(problem.type) && options.length < 2) {
    invalid('options', `${problem.type} needs at least two options`);
  }

  switch (problem.type) {
    case 'multiple_choice':
    case 'scenario': {
      if (new Set(options.map((option) => option.trim())).size !== options.length) {
        invalid('options', 'Choice options must have distinct labels');
      }
      const index = typeof correct === 'number' ? correct :
        typeof correct === 'string' && /^(0|[1-9]\d*)$/.test(correct) ? Number(correct) : NaN;
      if (!Number.isInteger(index) || index < 0 || index >= options.length) {
        invalid('correct', 'Correct answer must be a zero-based integer index within the options');
      }
      break;
    }
    case 'true_false':
      if (typeof correct !== 'boolean' && !(typeof correct === 'string' && /^(true|false)$/i.test(correct))) {
        invalid('correct', 'True/false answers must be true or false');
      }
      break;
    case 'fill_blank': {
      const answers = typeof correct === 'string' || typeof correct === 'number' ? [String(correct)] :
        typeof correct === 'object' && correct !== null && !Array.isArray(correct) && typeof correct.answer === 'string' && (correct.alternatives === undefined || Array.isArray(correct.alternatives))
          ? [correct.answer, ...(Array.isArray(correct.alternatives) ? correct.alternatives : [])] : [];
      if (answers.length === 0 || answers.some((answer) => !answer.trim())) {
        invalid('correct', 'Fill-blank answers need nonempty text, a number, or an answer with optional alternatives');
      }
      break;
    }
    case 'ordering': {
      const items = options.map((option) => option.trim());
      if (new Set(items).size !== items.length) invalid('options', 'Ordering items must be distinct');
      if (typeof correct === 'string') {
        if (!parseIndexOrder(correct, options.length)) {
          invalid('correct', 'Ordering answers must include every option index exactly once');
        }
      } else if (!Array.isArray(correct) || correct.length !== items.length ||
        !correct.every((item) => typeof item === 'string' && items.includes(item)) ||
        new Set<unknown>(correct).size !== items.length) {
        invalid('correct', 'Ordering answers must list every option text exactly once, or use comma-separated indices');
      }
      break;
    }
    case 'matching': {
      const pairs = options.map((option) => option.split('|').map((part) => part.trim()));
      if (pairs.some((pair) => pair.length !== 2 || pair.some((part) => !part)) ||
        new Set(pairs.map(([left]) => left)).size !== pairs.length) {
        invalid('options', 'Matching options must be distinct left labels paired with right labels as "left|right"');
      }
      if (typeof correct === 'string') {
        if (!parseIndexOrder(correct, options.length)) invalid('correct', 'Matching indices must include every option index exactly once');
      } else {
        const map = matchingAnswerMap(correct);
        const left = pairs.map(([label]) => label);
        const right = new Set(pairs.map(([, label]) => label));
        if (!map || Object.keys(map).length !== left.length ||
          left.some((label) => !Object.prototype.hasOwnProperty.call(map, label) || !right.has(map[label]))) {
          invalid('correct', 'Matching answers must map every left label to an offered right label');
        }
      }
      break;
    }
  }
}).transform((problem) => {
  if (problem.type === 'multiple_choice' || problem.type === 'scenario') {
    return { ...problem, correct: Number(problem.correct) };
  }
  if (problem.type === 'true_false') {
    return { ...problem, correct: typeof problem.correct === 'boolean' ? problem.correct : String(problem.correct).toLowerCase() === 'true' };
  }
  if (problem.type === 'ordering') {
    // The learner UI trims ordering item labels. Store the same labels so the
    // evaluator compares the exact values the learner can submit.
    return { ...problem, options: problem.options?.map((option) => option.trim()) };
  }
  if (problem.type === 'matching' && typeof problem.correct === 'string') {
    const pairs = problem.options!.map((option) => option.split('|').map((part) => part.trim()));
    const indices = parseIndexOrder(problem.correct, pairs.length)!;
    return { ...problem, correct: Object.fromEntries(pairs.map(([left], index) => [left, pairs[indices[index]][1]])) };
  }
  return problem;
});

const KnowledgePointYamlSchema = z.object({
  id: z.string().trim().min(1),
  instruction: z.string().optional(),
  instructionContent: z.array(ContentBlockYamlSchema).optional().default([]),
  workedExample: z.string().optional(),
  workedExampleContent: z.array(ContentBlockYamlSchema).optional().default([]),
  problems: z.array(ProblemYamlSchema).optional().default([]),
  // Slice 3 — the curated concept id whose prereq knowledge is most
  // directly used by this KP. When set, two failures across sessions
  // auto-trigger a remedial review on this concept (Math Academy Way,
  // Ch 4 p.76 + Ch 21 pp.300–301).
  // Optional during backfill; `graspful review` warns when missing.
  keyPrerequisite: z.string().optional(),
});

const EncompassingRefSchema = z.object({
  concept: z.string(),
  weight: z.number().min(0).max(1),
});

const ConceptYamlSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  section: z.string().optional(),
  difficulty: z.number().int().min(1).max(10),
  estimatedMinutes: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  sourceRef: z.string().optional(),
  prerequisites: z.array(z.string()).optional().default([]),
  encompassing: z.array(EncompassingRefSchema).optional().default([]),
  knowledgePoints: z.array(KnowledgePointYamlSchema).optional().default([]),
});

const SectionExamBlueprintYamlSchema = z.object({
  conceptId: z.string(),
  minQuestions: z.number().int().positive(),
});

const SectionExamYamlSchema = z.object({
  enabled: z.boolean().default(true),
  passingScore: z.number().min(0).max(1).default(0.75),
  timeLimitMinutes: z.number().int().positive().optional(),
  questionCount: z.number().int().positive().default(10),
  blueprint: z.array(SectionExamBlueprintYamlSchema).default([]),
  instructions: z.string().optional(),
});

const SectionYamlSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  sectionExam: SectionExamYamlSchema.optional(),
});

const CourseMetaSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  estimatedHours: z.number().positive(),
  version: z.string(),
  sourceDocument: z.string().optional(),
});

export const CourseYamlSchema = z
  .object({
    course: CourseMetaSchema,
    sections: z.array(SectionYamlSchema).optional().default([]),
    concepts: z.array(ConceptYamlSchema),
  })
  .superRefine((data, ctx) => {
    const conceptIds = new Set(data.concepts.map((concept) => concept.id));
    const sectionIds = new Set(data.sections.map((section) => section.id));
    const conceptToSection = new Map(
      data.concepts
        .filter((concept) => concept.section)
        .map((concept) => [concept.id, concept.section as string]),
    );

    for (const concept of data.concepts) {
      if (concept.section && !sectionIds.has(concept.section)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Concept "${concept.id}" references unknown section "${concept.section}"`,
        });
      }
    }

    for (const section of data.sections) {
      const exam = section.sectionExam;
      if (!exam?.enabled) {
        continue;
      }

      const sectionConcepts = data.concepts.filter(
        (concept) => concept.section === section.id,
      );

      if (sectionConcepts.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Section "${section.id}" needs at least two concepts when sectionExam is enabled`,
        });
      }

      const minQuestions = exam.blueprint.reduce(
        (sum, item) => sum + item.minQuestions,
        0,
      );
      if (exam.questionCount < minQuestions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Section "${section.id}" questionCount must be at least the sum of blueprint minQuestions`,
        });
      }

      const availableProblems = sectionConcepts.reduce(
        (sum, concept) =>
          sum +
          concept.knowledgePoints.reduce(
            (kpSum, kp) => kpSum + kp.problems.length,
            0,
          ),
        0,
      );

      if (availableProblems < exam.questionCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Section "${section.id}" does not have enough eligible problems for its section exam`,
        });
      }

      for (const item of exam.blueprint) {
        if (!conceptIds.has(item.conceptId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Section "${section.id}" blueprint references unknown concept "${item.conceptId}"`,
          });
          continue;
        }

        if (conceptToSection.get(item.conceptId) !== section.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Section "${section.id}" blueprint concept "${item.conceptId}" must belong to the same section`,
          });
        }
      }
    }
  });

export type CourseYaml = z.infer<typeof CourseYamlSchema>;
export type SectionYaml = z.infer<typeof SectionYamlSchema>;
export type SectionExamYaml = z.infer<typeof SectionExamYamlSchema>;
export type SectionExamBlueprintYaml = z.infer<
  typeof SectionExamBlueprintYamlSchema
>;
export type ConceptYaml = z.infer<typeof ConceptYamlSchema>;
export type KnowledgePointYaml = z.infer<typeof KnowledgePointYamlSchema>;
export type ProblemYaml = z.infer<typeof ProblemYamlSchema>;
export type ContentBlockYaml = z.infer<typeof ContentBlockYamlSchema>;
