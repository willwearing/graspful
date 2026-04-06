import { describe, expect, it } from 'bun:test';
import { validateParsedYaml } from '../validate';
import { describeCourse } from '../describe';
import {
  scaffoldCourseObject,
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
  return {
    id: `${conceptId}-kp${kpIndex}`,
    instruction: `Instruction for ${conceptId} KP${kpIndex}`,
    workedExample: `Worked example for ${conceptId} KP${kpIndex}`,
    problems: [
      makeProblem(`${conceptId}-kp${kpIndex}-p1`, `Q1 for ${conceptId} kp${kpIndex}`, 2),
      makeProblem(`${conceptId}-kp${kpIndex}-p2`, `Q2 for ${conceptId} kp${kpIndex}`, 3),
      makeProblem(`${conceptId}-kp${kpIndex}-p3`, `Q3 for ${conceptId} kp${kpIndex}`, 4),
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
    expect(kps).toHaveLength(2); // default kps = 2
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
});
