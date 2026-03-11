/**
 * Import a course YAML file into the database.
 * Usage: npx ts-node scripts/import-course.ts <orgSlug> <yamlPath>
 */
import { PrismaClient, ProblemType } from '@prisma/client';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Inline the schema to avoid path alias issues
const ProblemYamlSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'fill_blank', 'true_false', 'ordering', 'matching', 'scenario']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct: z.union([z.number(), z.string()]),
  explanation: z.string().optional(),
  difficulty: z.number().min(1).max(5).optional().default(3),
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
  difficulty: z.number().min(1).max(10),
  estimatedMinutes: z.number().positive().int(),
  tags: z.array(z.string()).optional().default([]),
  sourceRef: z.string().optional(),
  prerequisites: z.array(z.string()).optional().default([]),
  encompassing: z.array(EncompassingRefSchema).optional().default([]),
  knowledgePoints: z.array(KnowledgePointYamlSchema).optional().default([]),
});

const CourseYamlSchema = z.object({
  course: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    estimatedHours: z.number().positive(),
    version: z.string(),
    sourceDocument: z.string().optional(),
  }),
  concepts: z.array(ConceptYamlSchema),
});

async function main() {
  const [orgSlug, yamlPath] = process.argv.slice(2);
  if (!orgSlug || !yamlPath) {
    console.error('Usage: npx ts-node scripts/import-course.ts <orgSlug> <yamlPath>');
    process.exit(1);
  }

  // Resolve org
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    console.error(`Organization "${orgSlug}" not found`);
    process.exit(1);
  }
  console.log(`Org: ${org.name} (${org.id})`);

  // Parse YAML
  const raw = yaml.load(fs.readFileSync(yamlPath, 'utf-8'));
  const parseResult = CourseYamlSchema.safeParse(raw);
  if (!parseResult.success) {
    console.error('Invalid YAML:', parseResult.error.errors);
    process.exit(1);
  }
  const data = parseResult.data;
  console.log(`Course: ${data.course.name} (${data.concepts.length} concepts)`);

  // Delete existing course with same slug if present
  const existing = await prisma.course.findUnique({
    where: { orgId_slug: { orgId: org.id, slug: data.course.id } },
  });
  if (existing) {
    await prisma.course.delete({ where: { id: existing.id } });
    console.log(`Deleted existing course: ${existing.name}`);
  }

  // Import in transaction
  let kpCount = 0;
  let probCount = 0;

  const result = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        orgId: org.id,
        slug: data.course.id,
        name: data.course.name,
        description: data.course.description,
        version: data.course.version,
        estimatedHours: data.course.estimatedHours,
        isPublished: true,
      },
    });

    const slugToId = new Map<string, string>();

    for (let i = 0; i < data.concepts.length; i++) {
      const c = data.concepts[i];
      const concept = await tx.concept.create({
        data: {
          courseId: course.id,
          orgId: org.id,
          slug: c.id,
          name: c.name,
          difficulty: c.difficulty,
          estimatedMinutes: c.estimatedMinutes,
          tags: c.tags,
          sourceReference: c.sourceRef,
          sortOrder: i,
        },
      });
      slugToId.set(c.id, concept.id);

      for (let kpIdx = 0; kpIdx < c.knowledgePoints.length; kpIdx++) {
        const kp = c.knowledgePoints[kpIdx];
        const kpRecord = await tx.knowledgePoint.create({
          data: {
            conceptId: concept.id,
            slug: kp.id,
            sortOrder: kpIdx,
            instructionText: kp.instruction,
            workedExampleText: kp.workedExample,
          },
        });
        kpCount++;

        for (const prob of kp.problems) {
          await tx.problem.create({
            data: {
              knowledgePointId: kpRecord.id,
              type: prob.type as ProblemType,
              questionText: prob.question,
              options: prob.options ?? undefined,
              correctAnswer: prob.correct as any,
              explanation: prob.explanation,
              difficulty: prob.difficulty,
            },
          });
          probCount++;
        }
      }
    }

    // Prerequisite edges
    let prereqCount = 0;
    for (const c of data.concepts) {
      for (const prereqSlug of c.prerequisites) {
        const sourceId = slugToId.get(prereqSlug);
        const targetId = slugToId.get(c.id);
        if (sourceId && targetId) {
          await tx.prerequisiteEdge.create({
            data: { sourceConceptId: sourceId, targetConceptId: targetId },
          });
          prereqCount++;
        }
      }
    }

    // Encompassing edges
    let encompCount = 0;
    for (const c of data.concepts) {
      for (const enc of c.encompassing) {
        const sourceId = slugToId.get(c.id);
        const targetId = slugToId.get(enc.concept);
        if (sourceId && targetId) {
          await tx.encompassingEdge.create({
            data: { sourceConceptId: sourceId, targetConceptId: targetId, weight: enc.weight },
          });
          encompCount++;
        }
      }
    }

    return {
      courseId: course.id,
      concepts: data.concepts.length,
      knowledgePoints: kpCount,
      problems: probCount,
      prereqEdges: prereqCount,
      encompEdges: encompCount,
    };
  }, { maxWait: 60000, timeout: 60000 });

  console.log('\nImport complete!');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => { console.error('Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
