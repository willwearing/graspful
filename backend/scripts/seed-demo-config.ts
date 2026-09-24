import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CourseImporterService } from '../src/knowledge-graph/course-importer.service';
import type { PrismaService } from '../src/prisma/prisma.service';

export const DEMO_COURSES = {
  electrical: {
    slug: 'electrician-prep', name: 'ElectricianPrep', niche: 'electrical',
    domain: 'electricianprep.audio', brandId: 'electrician',
    file: 'content/electrical-nec/course.yaml',
  },
  javascript: {
    slug: 'javascript-prep', name: 'JSPrep', niche: 'javascript',
    domain: 'jsprep.audio', brandId: 'javascript',
    file: 'content/courses/javascript-fundamentals.yaml',
  },
} as const;

export type DemoCourse = keyof typeof DEMO_COURSES;

export function parseDemoCourse(args: string[]): DemoCourse {
  const course = args[0];
  if (args.length !== 1 || !(course in DEMO_COURSES) || !Object.hasOwn(DEMO_COURSES, course)) {
    throw new Error('Usage: bun run seed:demo <electrical|javascript>');
  }
  return course as DemoCourse;
}

export function readDemoCourse(course: DemoCourse, repoRoot = resolve(__dirname, '../..')) {
  return readFileSync(resolve(repoRoot, DEMO_COURSES[course].file), 'utf8');
}

export async function seedDemoCourse(
  course: DemoCourse,
  yaml: string,
  prisma: Pick<PrismaService, 'organization' | 'subscription'>,
  importer: Pick<CourseImporterService, 'importFromYaml'>,
) {
  const { slug, name, niche, domain, brandId } = DEMO_COURSES[course];
  const org = await prisma.organization.upsert({
    where: { slug },
    update: { name, niche },
    create: { slug, name, niche, settings: { domain, brandId } },
  });
  const result = await importer.importFromYaml(yaml, org.id, { replace: true });
  const subscription = { plan: 'free' as const, status: 'active' as const, maxMembers: 1000 };
  await prisma.subscription.upsert({
    where: { orgId: org.id },
    update: subscription,
    create: { orgId: org.id, stripeCustomerId: `cus_seed_${org.slug}`, ...subscription },
  });
  return { org, result };
}
