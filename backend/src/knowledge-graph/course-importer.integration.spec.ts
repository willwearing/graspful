import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { CourseYamlSchema } from './schemas/course-yaml.schema';
import { GraphValidationService } from './graph-validation.service';

describe('YAML Course File Validation (integration)', () => {
  const coursesDir = path.resolve(__dirname, '../../../content/courses');

  describe('ab-nfpa-1001-firefighter-i.yaml', () => {
    let data: any;

    beforeAll(() => {
      const content = fs.readFileSync(
        path.join(coursesDir, 'ab-nfpa-1001-firefighter-i.yaml'),
        'utf8',
      );
      data = yaml.load(content);
    });

    it('should pass Zod schema validation', () => {
      const result = CourseYamlSchema.safeParse(data);
      if (!result.success) {
        console.error(result.error.errors);
      }
      expect(result.success).toBe(true);
    });

    it('should have valid graph structure (no cycles)', () => {
      const parsed = CourseYamlSchema.parse(data);
      const conceptIds = parsed.concepts.map((c) => c.id);
      const prereqEdges = parsed.concepts.flatMap((c) =>
        c.prerequisites.map((p) => ({ source: p, target: c.id })),
      );
      const encompEdges = parsed.concepts.flatMap((c) =>
        c.encompassing.map((e) => ({ source: c.id, target: e.concept, weight: e.weight })),
      );

      const service = new GraphValidationService();
      const result = service.validate(conceptIds, prereqEdges, encompEdges);

      if (!result.isValid) {
        console.error('Validation errors:', result.errors);
      }
      // Log warnings but don't fail on them
      if (result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings);
      }
      expect(result.isValid).toBe(true);
    });

    it('should have at least 40 concepts', () => {
      const parsed = CourseYamlSchema.parse(data);
      expect(parsed.concepts.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('ny-real-estate-salesperson.yaml', () => {
    let data: any;

    beforeAll(() => {
      const content = fs.readFileSync(
        path.join(coursesDir, 'ny-real-estate-salesperson.yaml'),
        'utf8',
      );
      data = yaml.load(content);
    });

    it('should pass Zod schema validation', () => {
      const result = CourseYamlSchema.safeParse(data);
      if (!result.success) {
        console.error(result.error.errors);
      }
      expect(result.success).toBe(true);
    });

    it('should have valid graph structure (no cycles)', () => {
      const parsed = CourseYamlSchema.parse(data);
      const conceptIds = parsed.concepts.map((c) => c.id);
      const prereqEdges = parsed.concepts.flatMap((c) =>
        c.prerequisites.map((p) => ({ source: p, target: c.id })),
      );
      const encompEdges = parsed.concepts.flatMap((c) =>
        c.encompassing.map((e) => ({ source: c.id, target: e.concept, weight: e.weight })),
      );

      const service = new GraphValidationService();
      const result = service.validate(conceptIds, prereqEdges, encompEdges);

      if (!result.isValid) {
        console.error('Validation errors:', result.errors);
      }
      if (result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings);
      }
      expect(result.isValid).toBe(true);
    });

    it('should have at least 70 concepts', () => {
      const parsed = CourseYamlSchema.parse(data);
      expect(parsed.concepts.length).toBeGreaterThanOrEqual(70);
    });
  });

  describe('posthog-tam-onboarding.yaml', () => {
    let data: any;

    beforeAll(() => {
      const content = fs.readFileSync(
        path.join(coursesDir, 'posthog-tam-onboarding.yaml'),
        'utf8',
      );
      data = yaml.load(content);
    });

    it('should pass Zod schema validation', () => {
      const result = CourseYamlSchema.safeParse(data);
      if (!result.success) {
        console.error(result.error.errors);
      }
      expect(result.success).toBe(true);
    });

    it('should have valid graph structure (no cycles)', () => {
      const parsed = CourseYamlSchema.parse(data);
      const conceptIds = parsed.concepts.map((c) => c.id);
      const prereqEdges = parsed.concepts.flatMap((c) =>
        c.prerequisites.map((p) => ({ source: p, target: c.id })),
      );
      const encompEdges = parsed.concepts.flatMap((c) =>
        c.encompassing.map((e) => ({ source: c.id, target: e.concept, weight: e.weight })),
      );

      const service = new GraphValidationService();
      const result = service.validate(conceptIds, prereqEdges, encompEdges);

      if (!result.isValid) {
        console.error('Validation errors:', result.errors);
      }
      if (result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings);
      }
      expect(result.isValid).toBe(true);
    });

    it('should preserve the reviewed PostHog TAM scaffolding improvements', () => {
      const parsed = CourseYamlSchema.parse(data);
      const conceptById = new Map(parsed.concepts.map((concept) => [concept.id, concept]));
      const encompassingCount = parsed.concepts.reduce(
        (sum, concept) => sum + concept.encompassing.length,
        0,
      );
      const reviewedConceptIds = [
        'group-identify',
        'ph-cdp-overview',
        'ph-destinations-exports',
        'cohorts',
        'hogql-basics',
      ];

      expect(parsed.concepts.length).toBeGreaterThanOrEqual(35);
      expect(encompassingCount).toBeGreaterThanOrEqual(5);

      for (const conceptId of reviewedConceptIds) {
        const concept = conceptById.get(conceptId);

        expect(concept).toBeDefined();
        expect(concept?.knowledgePoints.length).toBeGreaterThanOrEqual(2);
        expect(
          concept?.knowledgePoints.some((kp) => Boolean(kp.workedExample?.trim())),
        ).toBe(true);
        expect(
          concept?.knowledgePoints.some(
            (kp) =>
              (kp.instructionContent?.length ?? 0) > 0 ||
              (kp.workedExampleContent?.length ?? 0) > 0,
          ),
        ).toBe(true);
      }
    });
  });
});
