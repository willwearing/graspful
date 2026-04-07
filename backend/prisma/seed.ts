import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function sha256(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create graspful org (needed for graspful.ai and app.graspful.ai brands)
  await prisma.organization.upsert({
    where: { slug: 'graspful' },
    update: {},
    create: {
      slug: 'graspful',
      name: 'Graspful',
      niche: 'general',
      isActive: true,
      settings: {},
    },
  });
  console.log('Organization: Graspful');

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

  // Create academy
  const academy = await prisma.academy.upsert({
    where: { orgId_slug: { orgId: org.id, slug: 'nfpa-1001' } },
    update: {},
    create: {
      orgId: org.id,
      slug: 'nfpa-1001',
      name: 'NFPA 1001 — Firefighter I & II',
      description: 'Complete audio-first exam prep covering all NFPA 1001 certification requirements for Firefighter I and II.',
    },
  });
  console.log(`Academy: ${academy.name} (${academy.id})`);

  // Create course (knowledge-graph model used by browse page)
  const course = await prisma.course.upsert({
    where: { orgId_slug: { orgId: org.id, slug: 'nfpa-1001' } },
    update: {},
    create: {
      orgId: org.id,
      academyId: academy.id,
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

  // ---------------------------------------------------------------------------
  // PostHog TAM org — needed by e2e tests that reference posthog-tam
  // ---------------------------------------------------------------------------
  const phOrg = await prisma.organization.upsert({
    where: { slug: 'posthog-tam' },
    update: {},
    create: {
      slug: 'posthog-tam',
      name: 'PostHog TAM',
      niche: 'analytics',
      isActive: true,
      settings: {},
    },
  });
  console.log(`Organization: ${phOrg.name} (${phOrg.id})`);

  const phAcademy = await prisma.academy.upsert({
    where: { orgId_slug: { orgId: phOrg.id, slug: 'posthog-tam-onboarding' } },
    update: {},
    create: {
      orgId: phOrg.id,
      slug: 'posthog-tam-onboarding',
      name: 'PostHog TAM Academy',
      description: 'Technical onboarding for PostHog TAMs.',
    },
  });
  console.log(`Academy: ${phAcademy.name}`);

  const phCourse = await prisma.course.upsert({
    where: { orgId_slug: { orgId: phOrg.id, slug: 'posthog-tam-onboarding' } },
    update: {},
    create: {
      orgId: phOrg.id,
      academyId: phAcademy.id,
      slug: 'posthog-tam-onboarding',
      name: 'PostHog TAM Technical Onboarding',
      description: 'Comprehensive technical onboarding for PostHog TAMs.',
      version: '1.0',
      estimatedHours: 12,
      isPublished: true,
    },
  });
  console.log(`Course: ${phCourse.name}`);

  const phSection = await prisma.courseSection.upsert({
    where: { courseId_slug: { courseId: phCourse.id, slug: 'posthog-data-model' } },
    update: {},
    create: {
      courseId: phCourse.id,
      slug: 'posthog-data-model',
      name: 'PostHog Data Model',
      description: 'PostHog entities — events, persons, properties, sessions, and actions.',
      sortOrder: 0,
    },
  });

  // Seed 3 concepts with KPs and problems for diagnostic tests
  const phConcepts = [
    {
      slug: 'ph-events',
      name: 'PostHog Events — The Atomic Unit',
      instruction: 'Every interaction in PostHog is captured as an event. Events have a name, timestamp, distinct_id, and properties.',
      question: 'What is the atomic unit of data in PostHog?',
      options: ['Event', 'Person', 'Session', 'Action'],
      correctAnswer: 0,
    },
    {
      slug: 'ph-persons',
      name: 'Persons & Person Profiles',
      instruction: 'A person in PostHog is identified by one or more distinct_ids. Person profiles store properties set via $set and $set_once.',
      question: 'How are persons identified in PostHog?',
      options: ['By email only', 'By one or more distinct_ids', 'By IP address', 'By session cookie'],
      correctAnswer: 1,
    },
    {
      slug: 'ph-sessions',
      name: 'Sessions — Grouping Events by Visit',
      instruction: 'Sessions group events by visit. A session starts when a user arrives and ends after 30 minutes of inactivity.',
      question: 'What triggers the end of a PostHog session?',
      options: ['Closing the browser', '30 minutes of inactivity', 'Navigating away', 'Midnight rollover'],
      correctAnswer: 1,
    },
  ];

  for (let ci = 0; ci < phConcepts.length; ci++) {
    const c = phConcepts[ci];
    const concept = await prisma.concept.upsert({
      where: { courseId_slug: { courseId: phCourse.id, slug: c.slug } },
      update: {},
      create: {
        courseId: phCourse.id,
        orgId: phOrg.id,
        sectionId: phSection.id,
        slug: c.slug,
        name: c.name,
        difficulty: 3,
        sortOrder: ci,
      },
    });

    const kp = await prisma.knowledgePoint.upsert({
      where: { conceptId_slug: { conceptId: concept.id, slug: `${c.slug}-kp1` } },
      update: {},
      create: {
        conceptId: concept.id,
        slug: `${c.slug}-kp1`,
        sortOrder: 0,
        instructionText: c.instruction,
      },
    });

    await prisma.problem.upsert({
      where: { knowledgePointId_authoredId: { knowledgePointId: kp.id, authoredId: `${c.slug}-kp1-p1` } },
      update: {},
      create: {
        knowledgePointId: kp.id,
        authoredId: `${c.slug}-kp1-p1`,
        type: 'multiple_choice',
        questionText: c.question,
        options: c.options.map((text, i) => ({ id: `opt-${i}`, text })),
        correctAnswer: { optionId: `opt-${c.correctAnswer}` },
        explanation: 'See the lesson above for details.',
        difficulty: 3,
      },
    });
  }
  console.log(`Seeded ${phConcepts.length} concepts with KPs and problems for PostHog TAM course`);

  // ---------------------------------------------------------------------------
  // Electrician-Prep org — needed for electrician brand's orgSlug
  // ---------------------------------------------------------------------------
  const elecOrg = await prisma.organization.upsert({
    where: { slug: 'electrician-prep' },
    update: {},
    create: {
      slug: 'electrician-prep',
      name: 'ElectricianPrep',
      niche: 'electrician',
      isActive: true,
      settings: {},
    },
  });
  console.log(`Organization: ${elecOrg.name}`);

  const elecAcademy = await prisma.academy.upsert({
    where: { orgId_slug: { orgId: elecOrg.id, slug: 'nec-2023' } },
    update: {},
    create: {
      orgId: elecOrg.id,
      slug: 'nec-2023',
      name: 'NEC 2023 Electrician Exam Prep',
      description: 'Audio-first NEC exam preparation.',
    },
  });

  await prisma.course.upsert({
    where: { orgId_slug: { orgId: elecOrg.id, slug: 'nec-2023' } },
    update: {},
    create: {
      orgId: elecOrg.id,
      academyId: elecAcademy.id,
      slug: 'nec-2023',
      name: 'NEC 2023 Electrician Exam Prep',
      description: 'Audio-first NEC exam preparation.',
      version: '1.0',
      estimatedHours: 20,
      isPublished: true,
    },
  });
  console.log(`Academy + Course for ElectricianPrep`);

  // JavaScript-Prep org — needed for javascript brand's orgSlug
  await prisma.organization.upsert({
    where: { slug: 'javascript-prep' },
    update: {},
    create: {
      slug: 'javascript-prep',
      name: 'JSPrep',
      niche: 'programming',
      isActive: true,
      settings: {},
    },
  });
  console.log(`Organization: JSPrep`);

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
