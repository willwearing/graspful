import { describe, expect, it } from 'bun:test';
import { validateParsedYaml } from '../validate';
import { describeCourse } from '../describe';
import {
  scaffoldCourseObject,
  scaffoldAcademyObject,
  scaffoldBrandObject,
  fillConceptInRaw,
} from '../scaffold';
import { runQualityGate } from '../quality-gate';
import type { CourseYaml } from '../schemas/course-yaml.schema';

// ---------------------------------------------------------------------------
// Minimal valid course fixture: 2 concepts, 2 KPs each, 3 problems each,
// difficulty staircase (2, 3, 4) per KP.
// ---------------------------------------------------------------------------

function makeProblem(id: string, question: string, difficulty: number) {
  return {
    id,
    type: 'multiple_choice' as const,
    question,
    options: ['A', 'B', 'C', 'D'],
    correct: 0,
    explanation: 'Because A is correct.',
    difficulty,
  };
}

function makeKp(conceptId: string, kpIndex: number) {
  const conceptLabel =
    conceptId === 'concept-a'
      ? 'fractions and addition'
      : 'equivalent fractions and simplification';
  return {
    id: `${conceptId}-kp${kpIndex}`,
    instruction: `Teach ${conceptLabel} in ${conceptId} KP${kpIndex} with a scaffolded explanation and guided practice.`,
    workedExample: `Worked example for ${conceptLabel} in ${conceptId} KP${kpIndex}.`,
    problems: [
      makeProblem(`${conceptId}-kp${kpIndex}-p1`, `Which fractions addition step is correct for ${conceptLabel}?`, 2),
      makeProblem(`${conceptId}-kp${kpIndex}-p2`, `How does ${conceptLabel} work in this example?`, 3),
      makeProblem(`${conceptId}-kp${kpIndex}-p3`, `When should you apply ${conceptLabel} to solve the problem?`, 4),
    ],
  };
}

const MINIMAL_COURSE = {
  course: {
    id: 'test-course',
    name: 'Test Course',
    description: 'A minimal test course',
    estimatedHours: 2,
    version: '2026.1',
  },
  sections: [
    { id: 'basics', name: 'Basics', description: 'Foundational material' },
  ],
  concepts: [
    {
      id: 'concept-a',
      name: 'Concept A',
      section: 'basics',
      difficulty: 2,
      estimatedMinutes: 10,
      tags: ['foundational'],
      prerequisites: [],
      knowledgePoints: [makeKp('concept-a', 1), makeKp('concept-a', 2)],
    },
    {
      id: 'concept-b',
      name: 'Concept B',
      section: 'basics',
      difficulty: 3,
      estimatedMinutes: 15,
      tags: ['intermediate'],
      prerequisites: ['concept-a'],
      knowledgePoints: [makeKp('concept-b', 1), makeKp('concept-b', 2)],
    },
  ],
};

// ---------------------------------------------------------------------------
// validateParsedYaml
// ---------------------------------------------------------------------------

describe('validateParsedYaml', () => {
  it('returns valid for a minimal course', () => {
    const result = validateParsedYaml(MINIMAL_COURSE);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('course');
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for a brand', () => {
    const brand = scaffoldBrandObject('tech', { name: 'TestBrand', orgSlug: 'test-org' });
    const result = validateParsedYaml(brand);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('brand');
  });

  it('errors when no top-level key is present', () => {
    const result = validateParsedYaml({ foo: 'bar' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/file type/i);
  });

  it('errors when a prerequisite references an unknown concept', () => {
    const bad = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    bad.concepts[1].prerequisites = ['nonexistent'];
    const result = validateParsedYaml(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown prerequisite'))).toBe(true);
  });

  it('errors when a cycle exists', () => {
    const bad = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    // concept-a -> concept-b -> concept-a
    bad.concepts[0].prerequisites = ['concept-b'];
    bad.concepts[1].prerequisites = ['concept-a'];
    const result = validateParsedYaml(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /cycle/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describeCourse
// ---------------------------------------------------------------------------

describe('describeCourse', () => {
  it('returns correct stats for the minimal course', () => {
    // Parse through the schema first so defaults are applied
    const { CourseYamlSchema } = require('../schemas/course-yaml.schema');
    const parsed = CourseYamlSchema.parse(MINIMAL_COURSE) as CourseYaml;
    const desc = describeCourse(parsed);

    expect(desc.courseName).toBe('Test Course');
    expect(desc.courseId).toBe('test-course');
    expect(desc.version).toBe('2026.1');
    expect(desc.estimatedHours).toBe(2);
    expect(desc.concepts).toBe(2);
    expect(desc.authoredConcepts).toBe(2);
    expect(desc.stubConcepts).toBe(0);
    expect(desc.knowledgePoints).toBe(4); // 2 KPs * 2 concepts
    expect(desc.problems).toBe(12); // 3 problems * 4 KPs
    expect(desc.graphDepth).toBeGreaterThanOrEqual(1);
    expect(desc.conceptsWithoutKps).toBe(0);
    expect(desc.kpsWithoutProblems).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scaffoldCourseObject
// ---------------------------------------------------------------------------

describe('scaffoldCourseObject', () => {
  it('scaffolds a course with topic and hours', () => {
    const result = scaffoldCourseObject('Linear Algebra', { hours: 5 });
    expect(result.course.id).toBe('linear-algebra');
    expect(result.course.name).toBe('Linear Algebra');
    expect(result.course.estimatedHours).toBe(5);
    expect(result.course.version).toBe('2026.1');
    expect(result.sections).toHaveLength(2);
    expect(result.concepts).toHaveLength(1);
    expect(result.concepts[0].id).toBe('linear-algebra-intro');
    expect(result.concepts[0].prerequisites).toEqual([]);
  });
});

describe('scaffoldAcademyObject', () => {
  it('scaffolds an academy manifest with the default academy layers', () => {
    const result = scaffoldAcademyObject('PostHog TAM');
    expect(result.academy.id).toBe('posthog-tam');
    expect(result.academy.name).toBe('PostHog TAM Academy');
    expect(result.authoringPlan.sourceOfTruth.requiredBeforeGraphWork).toBe(true);
    expect(result.parts.map((part) => part.id)).toEqual([
      'foundations',
      'core-structures',
      'operational-flows',
      'applied-judgment',
    ]);
    expect(result.courses).toHaveLength(4);
    expect(result.courses[0].file).toBe('courses/posthog-tam-foundations.yaml');
    expect(result.courses[3].part).toBe('applied-judgment');
  });

  it('uses provided course names when present', () => {
    const result = scaffoldAcademyObject('Data Academy', {
      courseNames: ['Data Models', 'Data Pipelines'],
    });
    expect(result.courses).toHaveLength(2);
    expect(result.courses[0].id).toBe('data-models');
    expect(result.courses[0].part).toBe('foundations');
    expect(result.courses[1].id).toBe('data-pipelines');
    expect(result.courses[1].part).toBe('core-structures');
  });
});

// ---------------------------------------------------------------------------
// scaffoldBrandObject
// ---------------------------------------------------------------------------

describe('scaffoldBrandObject', () => {
  it('uses the indigo preset for tech niche', () => {
    const result = scaffoldBrandObject('tech', {});
    expect(result.theme.preset).toBe('indigo');
    expect(result.brand.tagline).toBe('Level up your skills');
    expect(result.landing.hero.ctaText).toBe('Start Learning');
  });

  it('falls back to default preset for unknown niche', () => {
    const result = scaffoldBrandObject('underwater-basket-weaving', {});
    expect(result.theme.preset).toBe('blue');
  });
});

// ---------------------------------------------------------------------------
// fillConceptInRaw
// ---------------------------------------------------------------------------

describe('fillConceptInRaw', () => {
  // Build a course with a stub concept (no KPs) for filling
  function makeStubCourse() {
    return JSON.parse(JSON.stringify({
      ...MINIMAL_COURSE,
      concepts: [
        {
          id: 'intro',
          name: 'Introduction',
          section: 'basics',
          difficulty: 2,
          estimatedMinutes: 10,
          tags: [],
          prerequisites: [],
          knowledgePoints: [],
        },
      ],
    }));
  }

  it('fills a stub concept with KPs and problems', () => {
    const raw = makeStubCourse();
    const result = fillConceptInRaw(raw, 'intro', {}) as Record<string, unknown>;
    const concepts = result['concepts'] as Array<Record<string, unknown>>;
    const kps = concepts[0]['knowledgePoints'] as unknown[];
    expect(kps).toHaveLength(3); // default scaffold starting point = 3
  });

  it('respects custom kp and problem counts', () => {
    const raw = makeStubCourse();
    const result = fillConceptInRaw(raw, 'intro', {
      kps: 3,
      problemsPerKp: 5,
    }) as Record<string, unknown>;
    const concepts = result['concepts'] as Array<Record<string, unknown>>;
    const kps = concepts[0]['knowledgePoints'] as Array<Record<string, unknown>>;
    expect(kps).toHaveLength(3);
    for (const kp of kps) {
      expect((kp['problems'] as unknown[]).length).toBe(5);
    }
  });

  it('throws when concept already has KPs', () => {
    const raw = JSON.parse(JSON.stringify(MINIMAL_COURSE)); // concept-a already has KPs
    expect(() => fillConceptInRaw(raw, 'concept-a', {})).toThrow(/already has/);
  });

  it('throws when concept does not exist', () => {
    const raw = makeStubCourse();
    expect(() => fillConceptInRaw(raw, 'nonexistent', {})).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// runQualityGate
// ---------------------------------------------------------------------------

describe('runQualityGate', () => {
  it('returns a score for a well-formed course', () => {
    const result = runQualityGate(MINIMAL_COURSE);
    expect(result.score).toMatch(/^\d+\/10$/);
    expect(result.stats.concepts).toBe(2);
    expect(result.stats.kps).toBe(4);
    expect(result.stats.problems).toBe(12);
  });

  it('returns 0/10 for an empty object', () => {
    const result = runQualityGate({});
    expect(result.score).toBe('0/10');
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.stats.concepts).toBe(0);
  });

  it('fails when every problem in a KP tests material not taught in the current lesson path', () => {
    const bad = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    // Rewrite ALL problems in the first KP so none share vocabulary with the
    // teaching path. A single drifted problem should not be enough — the check
    // only fires when the whole KP looks off-topic.
    bad.concepts[0].knowledgePoints[0].problems[0].question =
      'Which division remainder proves the quotient is valid?';
    bad.concepts[0].knowledgePoints[0].problems[1].question =
      'How does integer division differ from floating point division?';
    bad.concepts[0].knowledgePoints[0].problems[2].question =
      'When does modular arithmetic produce a negative remainder?';

    const result = runQualityGate(bad);
    const alignmentFailure = result.failures.find(
      (failure) => failure.check === 'problem_teaching_alignment',
    );

    expect(alignmentFailure).toBeDefined();
    expect(alignmentFailure?.details).toMatch(/share no vocabulary/i);
  });

  it('does not fail the teaching-alignment check on a course with stub instructions', () => {
    // Stub-instruction fixtures (typical of e2e tests and in-progress drafts)
    // must not trip the teaching-alignment gate. When the KP has almost no
    // teaching content, the check has nothing to judge against and should skip.
    const stub = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    for (const concept of stub.concepts) {
      for (const kp of concept.knowledgePoints) {
        kp.instruction = 'Stub instruction.';
        kp.workedExample = 'Stub example.';
      }
    }

    const result = runQualityGate(stub);
    const alignmentCheck = [...result.failures, ...(result as any).warnings ?? []]
      .find((r: { check: string }) => r.check === 'problem_teaching_alignment');

    expect(alignmentCheck).toBeUndefined();
  });

  it('emits a kp_atomicity warning when a KP instruction contains a long parallel list', () => {
    const oversized = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    oversized.concepts[0].knowledgePoints[0].instruction = [
      'Every use case has a core product:',
      '',
      '- Product Analytics is primary for Product Intelligence.',
      '- Feature Flags is primary for Release Engineering.',
      '- Error Tracking is primary for Observability.',
      '- Web Analytics is primary for Growth & Marketing.',
      '- LLM Observability is primary for AI/LLM Observability.',
      '- Data Warehouse is primary for Data Infrastructure.',
      '- Session Replay is primary for Customer Experience.',
    ].join('\n');

    const result = runQualityGate(oversized);
    const warning = result.warnings.find((w) => w.check === 'kp_atomicity');

    expect(warning).toBeDefined();
    expect(warning?.details).toMatch(/parallel list/i);
    // A warning MUST NOT flip the passed/score contract — warnings are advisory.
    expect(result.score).toMatch(/^\d+\/10$/);
  });

  it('does not warn when a KP instruction has no long parallel list', () => {
    const result = runQualityGate(MINIMAL_COURSE);
    const atomicityWarning = result.warnings.find((w) => w.check === 'kp_atomicity');
    expect(atomicityWarning).toBeUndefined();
  });

  // Slice 3 — key-prerequisite link warning
  it('emits a key_prerequisite_links warning when a KP has no key prerequisite', () => {
    const result = runQualityGate(MINIMAL_COURSE);
    const warning = result.warnings.find(
      (w) => w.check === 'key_prerequisite_links',
    );
    expect(warning).toBeDefined();
    expect(warning?.details).toMatch(/missing key prerequisite/i);
    // The warning MUST NOT flip the 10/10 passed/score contract.
    expect(result.score).toMatch(/^\d+\/10$/);
  });

  it('does NOT emit a key_prerequisite_links warning when every KP has a valid link', () => {
    const happy = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    const conceptIds = happy.concepts.map((c: { id: string }) => c.id);
    for (const concept of happy.concepts) {
      for (const kp of concept.knowledgePoints) {
        // Point every KP at the first concept in the course — any valid
        // concept id is accepted for the fixture.
        kp.keyPrerequisite = conceptIds[0];
      }
    }
    const result = runQualityGate(happy);
    const warning = result.warnings.find(
      (w) => w.check === 'key_prerequisite_links',
    );
    expect(warning).toBeUndefined();
  });

  it('emits a key_prerequisite_links warning when a link points at an unknown concept', () => {
    const bad = JSON.parse(JSON.stringify(MINIMAL_COURSE));
    bad.concepts[0].knowledgePoints[0].keyPrerequisite = 'does-not-exist';
    const result = runQualityGate(bad);
    const warning = result.warnings.find(
      (w) => w.check === 'key_prerequisite_links' && w.details?.includes('unknown concept'),
    );
    expect(warning).toBeDefined();
  });
});
