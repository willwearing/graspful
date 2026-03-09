import { z } from 'zod';

const ProblemYamlSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'fill_blank', 'true_false', 'ordering', 'matching', 'scenario']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct: z.union([z.number(), z.string()]),
  explanation: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

const KnowledgePointYamlSchema = z.object({
  id: z.string(),
  instruction: z.string().optional(),
  workedExample: z.string().optional(),
  problems: z.array(ProblemYamlSchema).optional().default([]),
});

const EncompassingRefSchema = z.object({
  concept: z.string(),
  weight: z.number().min(0).max(1),
});

const ConceptYamlSchema = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().int().min(1).max(10),
  estimatedMinutes: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  sourceRef: z.string().optional(),
  prerequisites: z.array(z.string()).optional().default([]),
  encompassing: z.array(EncompassingRefSchema).optional().default([]),
  knowledgePoints: z.array(KnowledgePointYamlSchema).optional().default([]),
});

const CourseMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  estimatedHours: z.number().positive(),
  version: z.string(),
  sourceDocument: z.string().optional(),
});

export const CourseYamlSchema = z.object({
  course: CourseMetaSchema,
  concepts: z.array(ConceptYamlSchema),
});

export type CourseYaml = z.infer<typeof CourseYamlSchema>;
export type ConceptYaml = z.infer<typeof ConceptYamlSchema>;
export type KnowledgePointYaml = z.infer<typeof KnowledgePointYamlSchema>;
export type ProblemYaml = z.infer<typeof ProblemYamlSchema>;
