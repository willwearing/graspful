import '../../../client/test-support/preload';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { handleToolCall, TOOLS } from '../index';

const oldFetch = globalThis.fetch;
const oldKey = process.env.GRASPFUL_API_KEY;
let calls: Array<{ url: string; body: Record<string, unknown> }>;
beforeEach(() => {
  calls = [];
  process.env.GRASPFUL_API_KEY = 'gsk_cleanup';
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : {} });
    return Response.json({ courseId: 'course-1', published: false });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = oldFetch;
  if (oldKey === undefined) delete process.env.GRASPFUL_API_KEY;
  else process.env.GRASPFUL_API_KEY = oldKey;
});
test('course import sends replacement and archive options', async () => {
  await handleToolCall('graspful_import_course', { org: 'example', yaml: 'course: {}', replace: true, archiveMissing: true });
  expect(calls[0].body).toMatchObject({ replace: true, archiveMissing: true });
  const schema = TOOLS.find((tool) => tool.name === 'graspful_import_course')!.inputSchema;
  expect(schema.properties).toHaveProperty('replace');
  expect(schema.properties).toHaveProperty('archiveMissing');
});
test('encodes organization and course path segments', async () => {
  await handleToolCall('graspful_publish_course', { org: 'my/org?#', courseId: 'id/segment?#' });
  expect(calls[0].url).toEndWith('/orgs/my%2Forg%3F%23/courses/id%2Fsegment%3F%23/publish');
});
test('rejects wrong input types before API calls', async () => {
  const result = await handleToolCall('graspful_import_course', { org: 123, yaml: false });
  expect(result.isError).toBe(true);
  expect(calls).toHaveLength(0);
});
test('rejects missing and invalid offline arguments', async () => {
  const result = await handleToolCall('graspful_scaffold_course', { topic: 'Test', estimatedHours: -2 });
  expect(result.isError).toBe(true);
});
test('brand import validates before creating a brand', async () => {
  const result = await handleToolCall('graspful_import_brand', { yaml: 'brand: { id: example }' });
  expect(result.isError).toBe(true);
  expect(calls).toHaveLength(0);
});


test.each(['unknown', '__proto__', 'toString'])('unknown tool %s returns a tool error', async (name) => {
  const result = await handleToolCall(name, {});
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Unknown tool');
  expect(calls).toHaveLength(0);
});
