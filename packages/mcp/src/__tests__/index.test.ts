import { describe, expect, test, beforeAll } from 'bun:test';
import { TOOLS, handleToolCall, mcpDistinctId } from '../index';
import * as yaml from 'js-yaml';

// Helper: scaffold a course and return the YAML string
async function scaffoldCourse(topic = 'Test'): Promise<string> {
  const result = await handleToolCall('graspful_scaffold_course', { topic });
  return result.content[0].text;
}

describe('Tool registration', () => {
  test('TOOLS has exactly 12 entries', () => {
    expect(TOOLS.length).toBe(12);
  });

  test('all expected tool names are present', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain('graspful_create_academy');
    expect(names).toContain('graspful_scaffold_course');
    expect(names).toContain('graspful_fill_concept');
    expect(names).toContain('graspful_validate');
    expect(names).toContain('graspful_review_course');
    expect(names).toContain('graspful_import_academy');
    expect(names).toContain('graspful_import_course');
    expect(names).toContain('graspful_publish_course');
    expect(names).toContain('graspful_describe_course');
    expect(names).toContain('graspful_create_brand');
    expect(names).toContain('graspful_import_brand');
    expect(names).toContain('graspful_list_courses');
  });
});

describe('MCP analytics identity', () => {
  test('hashes API keys instead of sending the secret', () => {
    const originalUserId = process.env.GRASPFUL_USER_ID;
    const originalKey = process.env.GRASPFUL_API_KEY;
    delete process.env.GRASPFUL_USER_ID;
    process.env.GRASPFUL_API_KEY = 'gsk_secret';

    try {
      const result = mcpDistinctId();
      expect(result).toStartWith('credential:');
      expect(result).not.toContain('gsk_secret');
    } finally {
      if (originalUserId === undefined) {
        delete process.env.GRASPFUL_USER_ID;
      } else {
        process.env.GRASPFUL_USER_ID = originalUserId;
      }

      if (originalKey === undefined) {
        delete process.env.GRASPFUL_API_KEY;
      } else {
        process.env.GRASPFUL_API_KEY = originalKey;
      }
    }
  });

  test('does not collapse anonymous MCP processes into a shared constant', () => {
    const originalUserId = process.env.GRASPFUL_USER_ID;
    const originalKey = process.env.GRASPFUL_API_KEY;
    delete process.env.GRASPFUL_USER_ID;
    delete process.env.GRASPFUL_API_KEY;

    try {
      expect(mcpDistinctId()).toStartWith('anonymous-mcp:');
      expect(mcpDistinctId()).not.toBe('anonymous-mcp');
    } finally {
      if (originalUserId === undefined) {
        delete process.env.GRASPFUL_USER_ID;
      } else {
        process.env.GRASPFUL_USER_ID = originalUserId;
      }

      if (originalKey === undefined) {
        delete process.env.GRASPFUL_API_KEY;
      } else {
        process.env.GRASPFUL_API_KEY = originalKey;
      }
    }
  });
});

describe('graspful_scaffold_course', () => {
  test('returns valid YAML with course key', async () => {
    const yamlStr = await scaffoldCourse('Test');
    const parsed = yaml.load(yamlStr) as Record<string, unknown>;
    expect(parsed).toHaveProperty('course');
  });
});

describe('graspful_create_academy', () => {
  test('returns an academy-first scaffold with authoring gates', async () => {
    const result = await handleToolCall('graspful_create_academy', {
      topic: 'PostHog TAM',
    });
    const parsed = yaml.load(result.content[0].text) as Record<string, any>;

    expect(parsed).toHaveProperty('academy');
    expect(parsed).toHaveProperty('authoringPlan');
    expect(parsed.authoringPlan.sourceOfTruth.requiredBeforeGraphWork).toBe(true);
    expect(parsed.parts.map((part: any) => part.id)).toEqual([
      'foundations',
      'core-structures',
      'operational-flows',
      'applied-judgment',
    ]);
    expect(parsed.courses).toHaveLength(4);
  });
});

describe('graspful_validate', () => {
  test('valid course passes validation', async () => {
    const courseYaml = await scaffoldCourse('Validation Test');
    const result = await handleToolCall('graspful_validate', { yaml: courseYaml });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
  });

  test('bad YAML returns error', async () => {
    const result = await handleToolCall('graspful_validate', { yaml: ':::bad' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});

describe('graspful_fill_concept', () => {
  test('fills the intro concept with knowledgePoints', async () => {
    const courseYaml = await scaffoldCourse('Fill Test');
    // Parse to find the first concept id (concepts is top-level, not nested under course)
    const parsed = yaml.load(courseYaml) as Record<string, unknown>;
    const concepts = parsed.concepts as Array<Record<string, unknown>>;
    const conceptId = concepts[0].id as string;

    const result = await handleToolCall('graspful_fill_concept', {
      yaml: courseYaml,
      conceptId,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('knowledgePoints');
  });
});

describe('graspful_review_course', () => {
  test('returns a score matching d/10 pattern', async () => {
    const courseYaml = await scaffoldCourse('Review Test');
    const result = await handleToolCall('graspful_review_course', { yaml: courseYaml });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.score).toMatch(/\d+\/10/);
  });
});

describe('graspful_describe_course', () => {
  test('returns courseName in stats', async () => {
    const courseYaml = await scaffoldCourse('Describe Test');
    const result = await handleToolCall('graspful_describe_course', { yaml: courseYaml });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveProperty('courseName');
  });
});

describe('graspful_create_brand', () => {
  test('returns brand YAML', async () => {
    const result = await handleToolCall('graspful_create_brand', { niche: 'tech' });
    const text = result.content[0].text;
    const parsed = yaml.load(text) as Record<string, unknown>;
    expect(parsed).toHaveProperty('brand');
  });
});

describe('auth-required tools', () => {
  test('graspful_import_course fails without API key', async () => {
    const originalKey = process.env.GRASPFUL_API_KEY;
    delete process.env.GRASPFUL_API_KEY;
    try {
      const result = await handleToolCall('graspful_import_course', {
        yaml: 'course: {}',
        org: 'test-org',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not authenticated');
    } finally {
      // Restore original value if it existed
      if (originalKey !== undefined) {
        process.env.GRASPFUL_API_KEY = originalKey;
      }
    }
  });
});
