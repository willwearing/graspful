import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';
import { CourseYamlSchema, scaffoldCourseObject } from '@graspful/shared';
import { COURSE_CONTENT_TEMPLATE, parseBrandSettings } from '@graspful/creator-ui/contracts';
import NewCoursePage from '@/app/(app)/creator/manage/page';
import EditCoursePage from '@/app/(app)/creator/manage/[courseId]/page';

const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn(), orgSlug: 'my-org' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({ courseId: 'course-id' }),
}));
vi.mock('next/dynamic', () => ({ default: () => function Editor(props: {
  value: string; onChange: (value: string) => void; options?: { readOnly?: boolean };
}) {
  return <textarea aria-label="YAML" value={props.value} disabled={props.options?.readOnly}
    onChange={(event) => props.onChange(event.target.value)} />;
} }));
vi.mock('@/lib/contexts/creator-org-context', () => ({ useCreatorOrg: () => ({ orgSlug: mocks.orgSlug }) }));
vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: () => ({
  auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
}) }));
vi.mock('@/lib/api-client', () => ({ apiClientFetch: mocks.api }));

const originalCourse = stringify(scaffoldCourseObject('Existing course', {}));
const defaultBrand = {
  slug: 'my-org', orgSlug: 'my-org', domain: 'my-org.graspful.ai', name: 'My academy',
  tagline: 'Practice useful skills', logoUrl: '/icon.svg',
  theme: { preset: 'indigo' },
  landing: { hero: { headline: 'Welcome' }, features: { items: [] }, howItWorks: { items: [] } },
  seo: { title: 'My academy' }, pricing: {}, contentScope: {},
};

let savedCourse: string;
let savedBrand: typeof defaultBrand;

beforeEach(() => {
  mocks.api.mockReset();
  mocks.push.mockReset();
  mocks.orgSlug = 'my-org';
  savedCourse = originalCourse;
  savedBrand = structuredClone(defaultBrand);
  mocks.api.mockImplementation(async (path: string, _token: string, options?: RequestInit) => {
    if (path === '/brands') return [savedBrand, { ...defaultBrand, slug: 'other-brand', orgSlug: 'another-org' }];
    if (path.endsWith('/yaml')) return { yaml: savedCourse };
    if (path.endsWith('/courses/import')) {
      savedCourse = JSON.parse(options?.body as string).yaml;
      return { courseId: 'course-id' };
    }
    if (path === '/brands/my-org' && options?.method === 'PATCH') {
      savedBrand = { ...savedBrand, ...JSON.parse(options.body as string) };
      return savedBrand;
    }
    throw new Error(`Unexpected request: ${path}`);
  });
});

afterEach(cleanup);

async function editorValue() {
  return await screen.findByRole('textbox', { name: 'YAML' }) as HTMLTextAreaElement;
}

describe('creator editor contracts', () => {
  it('serves the exact shared, structurally valid course scaffold', async () => {
    render(<NewCoursePage />);
    const editor = await editorValue();
    expect(editor.value).toBe(COURSE_CONTENT_TEMPLATE);
    expect(CourseYamlSchema.safeParse(parse(editor.value)).success).toBe(true);
    expect(parse(editor.value)).toEqual(scaffoldCourseObject('My course', {}));
    expect(screen.getByText(/The starter is a draft/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Course content' })).toHaveAttribute('aria-selected', 'true');
  });

  it('imports only the course draft and navigates after server confirmation', async () => {
    render(<NewCoursePage />);
    const editor = await editorValue();
    fireEvent.click(screen.getByRole('button', { name: 'Import draft' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/creator/manage/course-id'));
    const call = mocks.api.mock.calls.find((args) => args[0].endsWith('/courses/import'))!;
    expect(JSON.parse(call[2].body)).toEqual({ yaml: editor.value });
    expect(mocks.api.mock.calls.some((args) => args[2]?.method === 'PATCH')).toBe(false);
  });

  it('saves an existing course with replacement enabled and reloads the saved YAML', async () => {
    const view = render(<EditCoursePage />);
    const editor = await editorValue();
    const updated = editor.value.replace('Adaptive course on Existing course', 'Updated course description');
    fireEvent.change(editor, { target: { value: updated } });
    fireEvent.click(screen.getByRole('button', { name: 'Save course changes' }));
    await screen.findByText('Course changes saved.');
    expect(mocks.api).toHaveBeenCalledWith('/orgs/my-org/courses/import', 'test-token', {
      method: 'POST', body: JSON.stringify({ yaml: updated, replace: true }),
    });
    view.unmount();
    render(<EditCoursePage />);
    expect((await editorValue()).value).toBe(updated);
  });

  it('rejects an edited course identity before submitting another course', async () => {
    render(<EditCoursePage />);
    const editor = await editorValue();
    fireEvent.change(editor, { target: { value: editor.value.replace('id: existing-course', 'id: different-course') } });
    fireEvent.click(screen.getByRole('button', { name: 'Save course changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep course.id as "existing-course"');
    expect(mocks.api.mock.calls.some((args) => args[2]?.method === 'POST')).toBe(false);
  });

  it('opens existing content that needs a schema repair and validates it before save', async () => {
    savedCourse = 'course:\n  id: existing-course\n  name: Legacy course\nconcepts: invalid\n';
    render(<EditCoursePage />);
    expect((await editorValue()).value).toBe(savedCourse);
    fireEvent.click(screen.getByRole('button', { name: 'Save course changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('concepts');
    expect(mocks.api.mock.calls.some((args) => args[2]?.method === 'POST')).toBe(false);
  });

  it('loads and saves every editable brand setting without discarding empty provisioned defaults', async () => {
    const view = render(<EditCoursePage />);
    await editorValue();
    fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    expect(screen.queryByRole('option', { name: /other-brand/ })).not.toBeInTheDocument();
    const editor = await editorValue();
    const settings = parseBrandSettings(editor.value);
    expect(settings.pricing).toEqual({});
    expect(settings.landing).toEqual(defaultBrand.landing);
    settings.name = 'Updated academy';
    settings.theme = { preset: 'emerald', nestedSetting: { enabled: true } };
    fireEvent.change(editor, { target: { value: stringify(settings) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save brand settings' }));
    await screen.findByText('Brand settings saved.');
    expect(mocks.api).toHaveBeenCalledWith('/brands/my-org', 'test-token', {
      method: 'PATCH', body: JSON.stringify(settings),
    });
    expect(mocks.api.mock.calls.some((args) => args[2]?.method === 'POST')).toBe(false);
    view.unmount();
    render(<EditCoursePage />);
    await editorValue();
    fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    expect(parseBrandSettings((await editorValue()).value)).toEqual(settings);
  });

  it.each(['course', 'brand'])('retains %s edits and offers a working save retry after a request failure', async (kind) => {
    render(<EditCoursePage />);
    await editorValue();
    if (kind === 'brand') fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    const editor = await editorValue();
    const updated = editor.value.replace(kind === 'course' ? 'Adaptive course on Existing course' : 'My academy', 'Retained edit');
    fireEvent.change(editor, { target: { value: updated } });
    mocks.api.mockRejectedValueOnce(new Error('Connection lost.'));
    const button = screen.getByRole('button', { name: kind === 'course' ? 'Save course changes' : 'Save brand settings' });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
    expect(editor.value).toBe(updated);
    expect(screen.queryByText(/changes saved|settings saved/)).not.toBeInTheDocument();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await screen.findByText(kind === 'course' ? 'Course changes saved.' : 'Brand settings saved.');
  });

  it('shows confirmed saved brand settings after a partial update', async () => {
    render(<EditCoursePage />);
    await editorValue();
    fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    fireEvent.change(await editorValue(), { target: { value: 'name: Partial update\n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save brand settings' }));
    await screen.findByText('Brand settings saved.');
    const confirmed = parseBrandSettings((await editorValue()).value);
    expect(confirmed.name).toBe('Partial update');
    expect(confirmed.tagline).toBe(defaultBrand.tagline);
    expect(confirmed.theme).toEqual(defaultBrand.theme);
  });

  it('does not redirect into a previous organization when an old import completes', async () => {
    const view = render(<NewCoursePage />);
    await editorValue();
    let finishImport!: (value: { courseId: string }) => void;
    mocks.api.mockImplementationOnce(() => new Promise((resolve) => { finishImport = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Import draft' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled());
    mocks.orgSlug = 'another-org';
    view.rerender(<NewCoursePage />);
    await editorValue();
    await act(async () => { finishImport({ courseId: 'old-org-course' }); });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText('Course imported as a draft.')).not.toBeInTheDocument();
  });

  it('rejects unsupported brand identity fields before sending a PATCH', async () => {
    render(<EditCoursePage />);
    await editorValue();
    fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    const editor = await editorValue();
    fireEvent.change(editor, { target: { value: `${editor.value}\norgSlug: another-org\n` } });
    fireEvent.click(screen.getByRole('button', { name: 'Save brand settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported brand setting: orgSlug');
    expect(mocks.api.mock.calls.some((args) => args[2]?.method === 'PATCH')).toBe(false);
  });

  it.each([
    'landing:\n  features:\n    items: wrong\n',
    'landing:\n  hero:\n    headline: [wrong]\n',
    'contentScope:\n  courseIds: 7\n',
  ])('rejects invalid nested brand settings before saving: %s', async (invalid) => {
    render(<EditCoursePage />);
    await editorValue();
    fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    fireEvent.change(await editorValue(), { target: { value: invalid } });
    fireEvent.click(screen.getByRole('button', { name: 'Save brand settings' }));
    await screen.findByRole('alert');
    expect(mocks.api.mock.calls.some((args) => args[2]?.method === 'PATCH')).toBe(false);
  });

  it('supports keyboard tab navigation', async () => {
    render(<NewCoursePage />);
    await editorValue();
    const course = screen.getByRole('tab', { name: 'Course content' });
    const brand = screen.getByRole('tab', { name: 'Brand settings' });
    course.focus();
    fireEvent.keyDown(course, { key: 'ArrowRight' });
    expect(brand).toHaveFocus();
    expect(brand).toHaveAttribute('aria-selected', 'true');
    expect(course).toHaveAttribute('tabIndex', '-1');
    fireEvent.keyDown(brand, { key: 'Home' });
    expect(course).toHaveFocus();
    expect(course).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an empty brand state with no save action when the org has no brands', async () => {
    mocks.api.mockResolvedValueOnce([]);
    render(<NewCoursePage />);
    await editorValue();
    fireEvent.click(screen.getByRole('tab', { name: 'Brand settings' }));
    expect(screen.getByText(/Create a brand with the Graspful CLI/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save brand settings' })).toBeDisabled();
  });

  it('recovers from a load failure without presenting an empty saveable editor', async () => {
    mocks.api.mockRejectedValueOnce(new Error('Load failed'));
    render(<NewCoursePage />);
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Import draft' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
    await editorValue();
    expect(screen.getByRole('button', { name: 'Import draft' })).toBeEnabled();
  });
});
