import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function sha256(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create org
  const org = await prisma.organization.upsert({
    where: { slug: 'firefighter-prep' },
    update: {},
    create: {
      slug: 'firefighter-prep',
      name: 'FirefighterPrep',
      niche: 'firefighting',
      isActive: true,
      settings: {},
    },
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  // Create user (simulating what Supabase auth trigger would do)
  const user = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@firefighterprep.audio',
      displayName: 'Admin User',
      isGlobalAdmin: true,
    },
  });
  console.log(`User: ${user.email} (${user.id})`);

  // Create org membership
  await prisma.orgMembership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });
  console.log(`Membership: ${user.email} is owner of ${org.name}`);

  // Create course (knowledge-graph model used by browse page)
  const course = await prisma.course.upsert({
    where: { orgId_slug: { orgId: org.id, slug: 'nfpa-1001' } },
    update: {},
    create: {
      orgId: org.id,
      slug: 'nfpa-1001',
      name: 'NFPA 1001 — Firefighter I & II',
      description: 'Complete audio-first exam prep covering all NFPA 1001 certification requirements for Firefighter I and II.',
      version: '1.0',
      estimatedHours: 40,
      isPublished: true,
    },
  });
  console.log(`Course: ${course.name} (${course.id})`);

  // Create exam
  const exam = await prisma.exam.upsert({
    where: { orgId_slug: { orgId: org.id, slug: 'nfpa-1001-2019' } },
    update: {},
    create: {
      orgId: org.id,
      title: 'NFPA 1001 Fire Fighter Level I (2019)',
      slug: 'nfpa-1001-2019',
      description: 'Standard for Fire Fighter Professional Qualifications',
      sourceDocument: 'NFPA 1001 (2019 Edition)',
      editionYear: 2019,
      isPublished: true,
      sortOrder: 0,
    },
  });
  console.log(`Exam: ${exam.title}`);

  // Create topic
  const topic = await prisma.topic.upsert({
    where: { examId_slug: { examId: exam.id, slug: 'fire-behavior' } },
    update: {},
    create: {
      examId: exam.id,
      title: 'Fire Behavior',
      slug: 'fire-behavior',
      description: 'Understanding how fire behaves in various conditions',
      sortOrder: 0,
    },
  });
  console.log(`Topic: ${topic.title}`);

  // Create section
  const section = await prisma.section.upsert({
    where: { topicId_slug: { topicId: topic.id, slug: 'combustion-process' } },
    update: {},
    create: {
      topicId: topic.id,
      title: 'The Combustion Process',
      slug: 'combustion-process',
      description: 'Chemical reactions in fire',
      sortOrder: 0,
    },
  });
  console.log(`Section: ${section.title}`);

  // Create study items
  const studyItems = [
    {
      title: 'Fire Triangle',
      textContent:
        'The fire triangle represents the three elements necessary for combustion: heat, fuel, and oxygen. Remove any one of these elements and the fire will be extinguished. Heat provides the energy necessary to start and maintain the combustion process. Fuel is any combustible material. Oxygen, typically from the air we breathe which contains approximately 21% oxygen, supports the chemical reaction.',
      sourceReference: 'NFPA 1001-2019 JPR 4.3.1',
      difficulty: 'beginner',
      importance: 'critical',
      tags: ['foundational', 'fire-science'],
    },
    {
      title: 'Stages of Fire Development',
      textContent:
        'Fire develops through four recognized stages: ignition, growth, fully developed, and decay. During ignition, the fire begins when heat, fuel, and oxygen combine. The growth stage is characterized by increasing temperatures and fire spread. At the fully developed stage, all combustible materials in the compartment are involved. The decay stage occurs as fuel is consumed and temperatures begin to decrease.',
      sourceReference: 'NFPA 1001-2019 JPR 4.3.2',
      difficulty: 'intermediate',
      importance: 'high',
      tags: ['fire-science', 'fire-development'],
    },
  ];

  for (const item of studyItems) {
    const textHash = sha256(item.textContent);
    await prisma.studyItem.upsert({
      where: {
        id: createHash('md5').update(`${section.id}-${item.title}`).digest('hex').slice(0, 8) +
          '-0000-0000-0000-000000000000',
      },
      update: {},
      create: {
        sectionId: section.id,
        title: item.title,
        textContent: item.textContent,
        textHash,
        charCount: item.textContent.length,
        difficulty: item.difficulty,
        importance: item.importance,
        tags: item.tags,
        sourceReference: item.sourceReference,
        sortOrder: studyItems.indexOf(item),
      },
    });
    console.log(`Study Item: ${item.title}`);
  }

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
