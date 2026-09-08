import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { handleToolCall } from '../index';

type ApiReply = Record<string, unknown> | Error | Response;
type RecordedRequest = { url: string; method: string | undefined; body: unknown };

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GRASPFUL_API_KEY;
const originalApiUrl = process.env.GRASPFUL_API_URL;
let requests: RecordedRequest[];
let replies: ApiReply[];

beforeEach(() => {
  process.env.GRASPFUL_API_KEY = 'gsk_publication_test';
  process.env.GRASPFUL_API_URL = 'https://publication.test';
  requests = [];
  replies = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const reply = replies.shift();
    if (reply === undefined) throw new Error('Unexpected API request');
    if (reply instanceof Error) throw reply;
    return reply instanceof Response ? reply : Response.json(reply);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GRASPFUL_API_KEY;
  else process.env.GRASPFUL_API_KEY = originalApiKey;
  if (originalApiUrl === undefined) delete process.env.GRASPFUL_API_URL;
  else process.env.GRASPFUL_API_URL = originalApiUrl;
});

const reviewFailure = {
  check: 'problem_variant_depth',
  passed: false,
  details: 'measurement has fewer than three problems',
};
const failureText = 'problem_variant_depth: measurement has fewer than three problems';
const fallbackFailure = 'The server did not confirm publication or return review failures.';

function readResult(result: Awaited<ReturnType<typeof handleToolCall>>) {
  return JSON.parse(result.content[0].text);
}

function importedAcademy(courseIds: string[]) {
  return {
    academyId: 'academy-1',
    academySlug: 'measurement',
    partCount: 1,
    courseCount: courseIds.length,
    courseResults: courseIds.map((courseId) => ({ courseId })),
    warnings: ['Existing draft content was replaced'],
  };
}

const academyArgs = {
  org: 'test-org',
  manifestYaml: 'academy: { id: measurement }',
  courseYamls: { 'course.yaml': 'course: { id: measurement }' },
  publish: true,
};

describe('graspful_publish_course publication results', () => {
  test('returns a tool error with the imported course and review details when publication is rejected', async () => {
    const response = {
      courseId: 'course-1',
      published: false,
      url: null,
      review: { score: '9/10', failures: [reviewFailure] },
    };
    replies.push(response);

    const result = await handleToolCall('graspful_publish_course', {
      org: 'test-org', courseId: 'course-1',
    });

    expect(result.isError).toBe(true);
    expect(readResult(result)).toEqual({
      ...response,
      status: 'not_published',
      publicationFailures: [failureText],
    });
    expect(requests).toEqual([{
      url: 'https://publication.test/api/v1/orgs/test-org/courses/course-1/publish',
      method: 'POST',
      body: {},
    }]);
  });

  test('explains an unconfirmed publication even when the server omits review details', async () => {
    replies.push({ courseId: 'course-1', published: false });
    const result = await handleToolCall('graspful_publish_course', {
      org: 'test-org', courseId: 'course-1',
    });

    expect(result.isError).toBe(true);
    expect(readResult(result).publicationFailures).toEqual([fallbackFailure]);
  });

  test.each([undefined, null, 'true', 1])('requires published to be boolean true, received %p', async (published) => {
    replies.push({ courseId: 'course-1', published });
    const result = await handleToolCall('graspful_publish_course', {
      org: 'test-org', courseId: 'course-1',
    });

    expect(result.isError).toBe(true);
    expect(readResult(result).status).toBe('not_published');
  });

  test('preserves a confirmed publication response without adding an error status', async () => {
    const response = {
      courseId: 'course-1', published: true, url: 'https://graspful.ai/courses/measurement',
      review: { score: '10/10', failures: [] },
    };
    replies.push(response);
    const result = await handleToolCall('graspful_publish_course', {
      org: 'test-org', courseId: 'course-1',
    });

    expect(result.isError).toBeUndefined();
    expect(readResult(result)).toEqual(response);
  });
});

describe('graspful_import_course publication results', () => {
  test('a draft import succeeds without requesting publication', async () => {
    const response = { courseId: 'course-1', published: false, url: null };
    replies.push(response);
    const result = await handleToolCall('graspful_import_course', {
      org: 'test-org', yaml: 'course: { id: measurement }',
    });

    expect(result.isError).toBeUndefined();
    expect(readResult(result)).toEqual(response);
    expect(requests).toEqual([{
      url: 'https://publication.test/api/v1/orgs/test-org/courses/import',
      method: 'POST',
      body: { yaml: 'course: { id: measurement }', publish: false },
    }]);
  });

  test('preserves the imported draft and reports review failures when requested publication fails', async () => {
    const response = {
      courseId: 'course-1', published: false,
      reviewFailures: [reviewFailure],
    };
    replies.push(response);
    const result = await handleToolCall('graspful_import_course', {
      org: 'test-org', yaml: 'course: { id: measurement }', publish: true,
    });

    expect(result.isError).toBe(true);
    expect(readResult(result)).toEqual({
      ...response,
      status: 'imported_but_not_published',
      publicationFailures: [failureText],
    });
    expect(requests[0].body).toEqual({ yaml: 'course: { id: measurement }', publish: true });
  });

  test.each([undefined, null, 'true', 1])('requires an explicit publication confirmation after import, received %p', async (published) => {
    replies.push({ courseId: 'course-1', published });
    const result = await handleToolCall('graspful_import_course', {
      org: 'test-org', yaml: 'course: {}', publish: true,
    });

    expect(result.isError).toBe(true);
    expect(readResult(result).status).toBe('imported_but_not_published');
    expect(readResult(result).publicationFailures).toEqual([fallbackFailure]);
  });

  test('succeeds when import includes confirmed publication', async () => {
    const response = { courseId: 'course-1', published: true, url: 'https://graspful.ai/courses/measurement' };
    replies.push(response);
    const result = await handleToolCall('graspful_import_course', {
      org: 'test-org', yaml: 'course: {}', publish: true,
    });

    expect(result.isError).toBeUndefined();
    expect(readResult(result)).toEqual(response);
  });
});

describe('graspful_import_academy publication results', () => {
  test('preserves a draft academy without making publication requests', async () => {
    const academy = importedAcademy(['course-1', 'course-2']);
    replies.push(academy);
    const result = await handleToolCall('graspful_import_academy', { ...academyArgs, publish: false });

    expect(result.isError).toBeUndefined();
    expect(readResult(result)).toEqual({ ...academy, publishedCourseIds: [], publishFailures: [] });
    expect(requests).toHaveLength(1);
  });

  test('counts each confirmed publication and preserves the academy import result', async () => {
    const academy = importedAcademy(['course-1', 'course-2']);
    replies.push(academy, { published: true }, { published: true });
    const result = await handleToolCall('graspful_import_academy', academyArgs);

    expect(result.isError).toBeUndefined();
    expect(readResult(result)).toEqual({
      ...academy, publishedCourseIds: ['course-1', 'course-2'], publishFailures: [],
    });
    expect(requests).toHaveLength(3);
  });

  test('returns an error with every review failure when no course is published', async () => {
    const academy = importedAcademy(['course-1', 'course-2']);
    replies.push(academy,
      { published: false, review: { failures: [reviewFailure] } },
      { published: false },
    );
    const result = await handleToolCall('graspful_import_academy', academyArgs);

    expect(result.isError).toBe(true);
    expect(readResult(result)).toEqual({
      ...academy,
      publishedCourseIds: [],
      publishFailures: [`course-1: ${failureText}`, `course-2: ${fallbackFailure}`],
      status: 'imported_but_not_published',
    });
    expect(requests).toHaveLength(3);
  });

  test('retains partial success and attempts later courses after gate and transport failures', async () => {
    const academy = importedAcademy(['course-1', 'course-2', 'course-3', 'course-4']);
    replies.push(academy,
      { published: false, reviewFailures: [reviewFailure] },
      new Error('Connection closed'),
      new Response('Service unavailable', { status: 503 }),
      { published: true },
    );
    const result = await handleToolCall('graspful_import_academy', academyArgs);

    expect(result.isError).toBe(true);
    expect(readResult(result)).toEqual({
      ...academy,
      publishedCourseIds: ['course-4'],
      publishFailures: [
        `course-1: ${failureText}`,
        'course-2: Connection closed',
        'course-3: API error 503: Service unavailable',
      ],
      status: 'partially_published',
    });
    expect(requests.slice(1).map((request) => request.url)).toEqual(
      academy.courseResults.map(({ courseId }) =>
        `https://publication.test/api/v1/orgs/test-org/courses/${courseId}/publish`),
    );
    expect(replies).toHaveLength(0);
  });

  test('excludes truthy and absent publication values from confirmed course IDs', async () => {
    const academy = importedAcademy(['course-1', 'course-2', 'course-3', 'course-4']);
    replies.push(academy, { published: 'true' }, { published: 1 }, {}, { published: true });
    const result = await handleToolCall('graspful_import_academy', academyArgs);
    const parsed = readResult(result);

    expect(result.isError).toBe(true);
    expect(parsed.publishedCourseIds).toEqual(['course-4']);
    expect(parsed.publishFailures).toEqual([
      `course-1: ${fallbackFailure}`,
      `course-2: ${fallbackFailure}`,
      `course-3: ${fallbackFailure}`,
    ]);
    expect(parsed.status).toBe('partially_published');
  });
});
