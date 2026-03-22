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

const ProblemYamlSchema = z.object({
  id: z.string(),
  type: z.enum([
    'multiple_choice',
    'fill_blank',
    'true_false',
    'ordering',
    'matching',
    'scenario',
  ]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct: z.union([z.number(), z.string()]),
  explanation: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

const KnowledgePointYamlSchema = z.object({
  id: z.string(),
  instruction: z.string().optional(),
  instructionContent: z.array(ContentBlockYamlSchema).optional().default([]),
  workedExample: z.string().optional(),
  workedExampleContent: z.array(ContentBlockYamlSchema).optional().default([]),
  problems: z.array(ProblemYamlSchema).optional().default([]),
});

const EncompassingRefSchema = z.object({
  concept: z.string(),
  weight: z.number().min(0).max(1),
});

const ConceptYamlSchema = z.object({
  id: z.string(),
  name: z.string(),
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
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  sectionExam: SectionExamYamlSchema.optional(),
});

const CourseMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
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
