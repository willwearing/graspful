/**
 * Quick course importer that runs directly with bun.
 * Usage: cd backend && bun scripts/import-course-quick.ts --orgId <uuid> --file <path>
 */
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { PrismaClient, ProblemType } from '@prisma/client';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  if (!parsed.orgId || !parsed.file) {
    console.error('Usage: bun scripts/import-course-quick.ts --orgId <uuid> --file <path>');
    process.exit(1);
  }
  return { orgId: parsed.orgId, file: parsed.file };
}

async function main() {
  const { orgId, file } = parseArgs();
  const prisma = new PrismaClient();

  const yamlContent = fs.readFileSync(file, 'utf-8');
  const data = yaml.load(yamlContent) as any;

  console.log(`Importing "${data.course.name}" into org ${orgId}...`);

  // Delete existing course with same slug
  const existing = await prisma.course.findUnique({
    where: { orgId_slug: { orgId, slug: data.course.id } },
  });
  if (existing) {
    await prisma.course.delete({ where: { id: existing.id } });
    console.log(`  Deleted existing course ${existing.id}`);
  }

  // Create course
  const course = await prisma.course.create({
    data: {
      orgId,
      slug: data.course.id,
      name: data.course.name,
      description: data.course.description,
      version: data.course.version,
      estimatedHours: data.course.estimatedHours,
    },
  });

  // Create sections
  const sectionSlugToId = new Map<string, string>();
  for (let i = 0; i < (data.sections || []).length; i++) {
    const s = data.sections[i];
    const section = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        slug: s.id,
        name: s.name,
        description: s.description,
        sortOrder: i,
      },
    });
    sectionSlugToId.set(s.id, section.id);
  }

  // Create concepts
  const slugToId = new Map<string, string>();
  let kpCount = 0;
  let probCount = 0;

  for (let i = 0; i < data.concepts.length; i++) {
    const c = data.concepts[i];
    const sectionId = c.section ? sectionSlugToId.get(c.section) ?? null : null;

    const concept = await prisma.concept.create({
      data: {
        courseId: course.id,
        orgId,
        sectionId,
        slug: c.id,
        name: c.name,
        difficulty: c.difficulty,
        estimatedMinutes: c.estimatedMinutes,
        tags: c.tags || [],
        sourceReference: c.sourceRef,
        sortOrder: i,
      },
    });
    slugToId.set(c.id, concept.id);

    for (let kpIdx = 0; kpIdx < (c.knowledgePoints || []).length; kpIdx++) {
      const kp = c.knowledgePoints[kpIdx];
      const knowledgePoint = await prisma.knowledgePoint.create({
        data: {
          conceptId: concept.id,
          slug: kp.id,
          sortOrder: kpIdx,
          instructionText: kp.instruction,
          workedExampleText: kp.workedExample,
        },
      });
      kpCount++;

      for (const prob of kp.problems || []) {
        await prisma.problem.create({
          data: {
            knowledgePointId: knowledgePoint.id,
            type: prob.type as ProblemType,
            questionText: prob.question,
            options: prob.options ?? undefined,
            correctAnswer: prob.correct as any,
            explanation: prob.explanation,
            difficulty: prob.difficulty ?? 3,
          },
        });
        probCount++;
      }
    }
  }

  // Create prerequisite edges
  let prereqCount = 0;
  for (const c of data.concepts) {
    for (const prereq of c.prerequisites || []) {
      const sourceId = slugToId.get(prereq);
      const targetId = slugToId.get(c.id);
      if (sourceId && targetId) {
        await prisma.prerequisiteEdge.create({
          data: { sourceConceptId: sourceId, targetConceptId: targetId },
        });
        prereqCount++;
      }
    }
  }

  // Create encompassing edges
  let encompCount = 0;
  for (const c of data.concepts) {
    for (const enc of c.encompassing || []) {
      const sourceId = slugToId.get(c.id);
      const targetId = slugToId.get(enc.concept);
      if (sourceId && targetId) {
        await prisma.encompassingEdge.create({
          data: { sourceConceptId: sourceId, targetConceptId: targetId, weight: enc.weight },
        });
        encompCount++;
      }
    }
  }

  console.log('Import complete:');
  console.log(`  Course ID: ${course.id}`);
  console.log(`  Sections: ${sectionSlugToId.size}`);
  console.log(`  Concepts: ${data.concepts.length}`);
  console.log(`  Knowledge Points: ${kpCount}`);
  console.log(`  Problems: ${probCount}`);
  console.log(`  Prerequisite Edges: ${prereqCount}`);
  console.log(`  Encompassing Edges: ${encompCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
