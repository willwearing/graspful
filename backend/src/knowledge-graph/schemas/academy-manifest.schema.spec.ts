import { AcademyManifestSchema } from './academy-manifest.schema';

describe('AcademyManifestSchema', () => {
  it('accepts a valid academy manifest', () => {
    const result = AcademyManifestSchema.safeParse({
      academy: {
        id: 'tam-academy',
        name: 'PostHog TAM Academy',
        version: '1.0',
      },
      parts: [
        {
          id: 'foundations',
          name: 'Foundations',
        },
      ],
      courses: [
        {
          id: 'data-models',
          name: 'Data Models',
          part: 'foundations',
          file: 'courses/data-models.yaml',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a course that references an unknown part', () => {
    const result = AcademyManifestSchema.safeParse({
      academy: {
        id: 'tam-academy',
        name: 'PostHog TAM Academy',
        version: '1.0',
      },
      parts: [],
      courses: [
        {
          id: 'data-models',
          name: 'Data Models',
          part: 'foundations',
          file: 'courses/data-models.yaml',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/unknown academy part/i);
  });

  it('rejects duplicate course ids and duplicate file paths', () => {
    const result = AcademyManifestSchema.safeParse({
      academy: {
        id: 'tam-academy',
        name: 'PostHog TAM Academy',
        version: '1.0',
      },
      parts: [],
      courses: [
        {
          id: 'data-models',
          name: 'Data Models',
          file: 'courses/shared.yaml',
        },
        {
          id: 'data-models',
          name: 'Data Models Again',
          file: 'courses/shared.yaml',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/duplicate academy course "data-models"/i),
        expect.stringMatching(/duplicate academy course file "courses\/shared.yaml"/i),
      ]),
    );
  });
});
