import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

const cliDir = path.resolve(__dirname, '../../..');
const reviewFailure = {
  check: 'publication_readiness',
  passed: false,
  details: 'Replace placeholder teaching in foundations.',
};
const review = {
  passed: false,
  score: '9/10',
  failures: [reviewFailure],
  warnings: [],
  stats: { concepts: 1, kps: 1, problems: 3, authoredConcepts: 1, stubConcepts: 0 },
};

describe('CLI publication results', () => {
  let server: ReturnType<typeof Bun.serve>;
  let directory: string;
  let responses: Array<{ body: unknown; status?: number }>;
  let requests: string[];

  beforeAll(() => {
    execFileSync('bun', ['run', 'build'], {
      cwd: cliDir,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe',
    });
    directory = mkdtempSync(path.join(tmpdir(), 'graspful-publication-test-'));
    writeFileSync(path.join(directory, 'course.yaml'), 'course: { id: course-one }\n');
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        requests.push(new URL(request.url).pathname);
        const response = responses.shift();
        return Response.json(response?.body ?? { error: 'Unexpected request' }, {
          status: response?.status ?? (response ? 200 : 500),
        });
      },
    });
  });

  beforeEach(() => {
    responses = [];
    requests = [];
  });

  afterAll(() => {
    server.stop(true);
    rmSync(directory, { recursive: true, force: true });
  });

  async function run(...args: string[]) {
    const process = Bun.spawn([Bun.which('bun')!, path.join(cliDir, 'dist/index.js'), ...args], {
      cwd: directory,
      env: {
        ...globalThis.process.env,
        NODE_ENV: 'test',
        GRASPFUL_TELEMETRY_DISABLED: '1',
        GRASPFUL_API_KEY: 'gsk_publication_test',
        GRASPFUL_API_URL: server.url.toString().replace(/\/$/, ''),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);
    return { stdout, stderr, exitCode };
  }

  function academy(courseIds: string[]) {
    writeFileSync(
      path.join(directory, 'academy.yaml'),
      `academy: { id: test-academy }\ncourses:\n${courseIds.map((id) => `  - file: ${id}.yaml`).join('\n')}\n`,
    );
    for (const id of courseIds) {
      writeFileSync(path.join(directory, `${id}.yaml`), `course: { id: ${id} }\n`);
    }
    return {
      academyId: 'academy-id',
      academySlug: 'test-academy',
      partCount: 1,
      courseCount: courseIds.length,
      courseResults: courseIds.map((courseId) => ({ courseId })),
      warnings: [],
    };
  }

  test('publish fails on HTTP 200 with published false and prints review details', async () => {
    responses.push({ body: { courseId: 'course-one', published: false, review } });
    const result = await run('publish', 'course-one', '--org', 'test-org');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(`publication_readiness: ${reviewFailure.details}`);
    expect(result.stderr).not.toContain('Published course:');
    expect(requests).toEqual(['/api/v1/orgs/test-org/courses/course-one/publish']);
  });

  test('failed publish JSON preserves the complete server review and error status', async () => {
    responses.push({ body: { courseId: 'course-one', published: false, review } });
    const result = await run('--format', 'json', 'publish', 'course-one', '--org', 'test-org');
    const error = JSON.parse(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(error.status).toBe('not_published');
    expect(error.review).toEqual(review);
    expect(error.publicationFailures).toEqual([`publication_readiness: ${reviewFailure.details}`]);
  });

  test.each([false, undefined, 'true'])('publish requires explicit boolean confirmation (%p)', async (published) => {
    responses.push({ body: { courseId: 'course-one', published } });
    const result = await run('publish', 'course-one', '--org', 'test-org');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('The server did not confirm publication');
    expect(result.stdout).toBe('');
  });

  test('publish succeeds only after the server confirms publication', async () => {
    responses.push({ body: { courseId: 'course-one', published: true } });
    const result = await run('publish', 'course-one', '--org', 'test-org');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Published course: course-one');
    expect(result.stderr).toBe('');
  });

  test('course import with failed publication returns nonzero with the saved draft and typed failures', async () => {
    responses.push({
      body: { courseId: 'course-one', published: false, reviewFailures: [reviewFailure], review },
    });
    const result = await run('--format', 'json', 'import', 'course.yaml', '--org', 'test-org', '--publish');
    const imported = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(1);
    expect(imported.status).toBe('imported_but_not_published');
    expect(imported.courseId).toBe('course-one');
    expect(imported.review).toEqual(review);
    expect(imported.publicationFailures).toEqual([`publication_readiness: ${reviewFailure.details}`]);
    expect(result.stdout).not.toContain('[object Object]');
  });

  test('course import with publication fails even when the server omits review failures', async () => {
    responses.push({ body: { courseId: 'course-one', published: false } });
    const result = await run('import', 'course.yaml', '--org', 'test-org', '--publish');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('The server did not confirm publication');
  });

  test('draft import succeeds without requesting publication', async () => {
    responses.push({ body: { courseId: 'course-one', published: false } });
    const result = await run('--format', 'json', 'import', 'course.yaml', '--org', 'test-org');

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).published).toBe(false);
  });

  test('course import succeeds when requested publication is confirmed', async () => {
    responses.push({ body: { courseId: 'course-one', published: true } });
    const result = await run('--format', 'json', 'import', 'course.yaml', '--org', 'test-org', '--publish');

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).published).toBe(true);
  });

  test('academy import counts only confirmed publications and continues after gate and HTTP failures', async () => {
    const imported = academy(['one', 'two', 'three', 'four']);
    responses.push(
      { body: imported },
      { body: { courseId: 'one', published: true } },
      { body: { courseId: 'two', published: false, review } },
      { body: { error: 'Temporary publication failure' }, status: 503 },
      { body: { courseId: 'four', published: true } },
    );
    const result = await run('--format', 'json', 'import', 'academy.yaml', '--org', 'test-org', '--publish');
    const data = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(1);
    expect(data.status).toBe('partially_published');
    expect(data.publishedCourseIds).toEqual(['one', 'four']);
    expect(data.publishFailures).toEqual([
      `two: publication_readiness: ${reviewFailure.details}`,
      'three: API error 503: {"error":"Temporary publication failure"}',
    ]);
    expect(data.courseResults).toEqual(imported.courseResults);
    expect(requests).toHaveLength(5);
    expect(requests.at(-1)).toBe('/api/v1/orgs/test-org/courses/four/publish');
  });

  test('academy import reports zero publications when every publication fails', async () => {
    responses.push(
      { body: academy(['one', 'two']) },
      { body: { courseId: 'one', published: false, review } },
      { body: { courseId: 'two', published: false } },
    );
    const result = await run('import', 'academy.yaml', '--org', 'test-org', '--publish');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Published 0 of 2 courses.');
    expect(result.stdout).toContain('one: publication_readiness:');
    expect(result.stdout).toContain('two: The server did not confirm publication');
  });

  test('academy import succeeds when all publications are confirmed', async () => {
    responses.push(
      { body: academy(['one', 'two']) },
      { body: { courseId: 'one', published: true } },
      { body: { courseId: 'two', published: true } },
    );
    const result = await run('--format', 'json', 'import', 'academy.yaml', '--org', 'test-org', '--publish');
    const data = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(data.publishedCourseIds).toEqual(['one', 'two']);
    expect(data.publishFailures).toEqual([]);
  });

  test('academy draft import sends no publication requests', async () => {
    responses.push({ body: academy(['one', 'two']) });
    const result = await run('--format', 'json', 'import', 'academy.yaml', '--org', 'test-org');
    const data = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(data.publishedCourseIds).toEqual([]);
    expect(data.publishFailures).toEqual([]);
    expect(requests).toEqual(['/api/v1/orgs/test-org/academies/import']);
  });
});
