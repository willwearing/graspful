import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActivityStart, type ActivityKind } from '../activity-start';
import { apiClientFetch, ApiError } from '@/lib/api-client';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock('@/lib/api-client', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/api-client')>(), apiClientFetch: vi.fn() }));
vi.mock('@/components/app/lesson-flow', () => ({ LessonFlow: (props: { continueHref: string }) => <a href={props.continueHref}>Lesson content</a> }));
vi.mock('@/components/app/diagnostic-flow', () => ({ DiagnosticFlow: (props: { courseId: string; completionHref: string }) => <a href={props.completionHref}>Diagnostic content {props.courseId}</a> }));
vi.mock('@/components/app/quiz-flow', () => ({ QuizFlow: () => <div>Quiz content</div> }));
vi.mock('@/components/app/review-flow', () => ({ ReviewFlow: () => <div>Review content</div> }));
vi.mock('@/components/app/section-exam-flow', () => ({ SectionExamFlow: () => <div>Exam content</div> }));
vi.mock('@/components/app/page-view-tracker', () => ({ AcademyEnrollTracker: () => null }));

const props = {
  orgSlug: 'test-org', courseId: 'course-id', token: 'current-token', conceptId: 'concept-id', sectionId: 'section-id',
  backHref: '/learn/test-org/courses/basics', continueHref: '/learn/test-org/courses/basics/study',
};

beforeEach(() => { vi.mocked(apiClientFetch).mockReset(); replace.mockReset(); refresh.mockReset(); });

it.each<ActivityKind>(['lesson', 'diagnostic', 'quiz', 'review', 'exam'])('does not mutate on %s render or rerender', (kind) => {
  const { rerender } = render(<ActivityStart {...props} kind={kind} />);
  rerender(<ActivityStart {...props} kind={kind} />);
  expect(apiClientFetch).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /^Start / })).toBeEnabled();
});

it.each([
  ['lesson', 'lessons/concept-id/start', 'Lesson content'],
  ['quiz', 'quizzes/generate', 'Quiz content'],
  ['review', 'reviews/concept-id/start', 'Review content'],
  ['exam', 'sections/section-id/exam/start', 'Exam content'],
] as const)('starts %s once and shows its flow', async (kind, suffix, content) => {
  let resolve: (value: unknown) => void = () => {};
  vi.mocked(apiClientFetch).mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<ActivityStart {...props} kind={kind} />);
  const start = screen.getByRole('button', { name: /^Start / });
  fireEvent.click(start);
  fireEvent.click(start);
  expect(apiClientFetch).toHaveBeenCalledExactlyOnceWith(`/orgs/test-org/courses/course-id/${suffix}`, 'current-token', { method: 'POST' });
  resolve({});
  expect(await screen.findByText(content)).toBeVisible();
});

it('enrolls before starting academy diagnostic and keeps the academy route', async () => {
  vi.mocked(apiClientFetch).mockResolvedValueOnce({}).mockResolvedValueOnce({ courseId: 'selected-course' });
  render(<ActivityStart {...props} kind="diagnostic" academyId="academy-id" backHref="/learn/test-org/academies/basics" />);
  fireEvent.click(screen.getByRole('button', { name: 'Start Diagnostic Assessment' }));
  await screen.findByText('Diagnostic content selected-course');
  expect(apiClientFetch).toHaveBeenNthCalledWith(1, '/orgs/test-org/academies/academy-id/enroll', 'current-token', { method: 'POST' });
  expect(apiClientFetch).toHaveBeenNthCalledWith(2, '/orgs/test-org/academies/academy-id/diagnostic/start', 'current-token', { method: 'POST' });
  expect(screen.getByRole('link')).toHaveAttribute('href', '/learn/test-org/academies/basics');
});

it('stops on enrollment failure and allows a deliberate retry', async () => {
  vi.mocked(apiClientFetch).mockRejectedValueOnce(new Error('Access denied'));
  render(<ActivityStart {...props} kind="diagnostic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Start Diagnostic Assessment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
  expect(apiClientFetch).toHaveBeenCalledTimes(1);
  vi.mocked(apiClientFetch).mockResolvedValueOnce({}).mockResolvedValueOnce({ courseId: 'course-id' });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('Diagnostic content course-id')).toBeVisible());
  expect(apiClientFetch).toHaveBeenCalledTimes(3);
});

it.each([undefined, 'academy-id'])('retries a failed diagnostic start after enrollment for %s', async (academyId) => {
  vi.mocked(apiClientFetch).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Temporary server error'));
  render(<ActivityStart {...props} kind="diagnostic" academyId={academyId} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start Diagnostic Assessment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Temporary server error');
  expect(screen.getByRole('link', { name: /^Back to / })).toHaveAttribute('href', props.backHref);
  vi.mocked(apiClientFetch).mockResolvedValueOnce({}).mockResolvedValueOnce({ courseId: 'selected-course' });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Diagnostic content selected-course');
  const base = academyId ? '/orgs/test-org/academies/academy-id' : '/orgs/test-org/courses/course-id';
  expect(vi.mocked(apiClientFetch).mock.calls.map(([path]) => path)).toEqual([
    `${base}/enroll`, `${base}/diagnostic/start`, `${base}/enroll`, `${base}/diagnostic/start`,
  ]);
});

it.each([undefined, 'academy-id'])('returns a completed learner to their course or academy for %s', async (academyId) => {
  const backHref = academyId ? '/learn/test-org/academies/basics' : props.backHref;
  vi.mocked(apiClientFetch).mockResolvedValueOnce({}).mockRejectedValueOnce(new ApiError(400, 'Diagnostic already completed'));
  render(<ActivityStart {...props} kind="diagnostic" academyId={academyId} backHref={backHref} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start Diagnostic Assessment' }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith(backHref));
  expect(refresh).toHaveBeenCalledOnce();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each([
  new ApiError(403, 'Diagnostic already completed'),
  new ApiError(400, 'No problems available for diagnostic'),
  new Error('Diagnostic already completed'),
])('keeps unrelated start failures available for retry: %s', async (cause) => {
  vi.mocked(apiClientFetch).mockResolvedValueOnce({}).mockRejectedValueOnce(cause);
  render(<ActivityStart {...props} kind="diagnostic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Start Diagnostic Assessment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(cause.message);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  expect(replace).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
});

it('keeps an enrollment rejection visible even if it uses the completion message', async () => {
  vi.mocked(apiClientFetch).mockRejectedValueOnce(new ApiError(400, 'Diagnostic already completed'));
  render(<ActivityStart {...props} kind="diagnostic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Start Diagnostic Assessment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Diagnostic already completed');
  expect(apiClientFetch).toHaveBeenCalledTimes(1);
  expect(replace).not.toHaveBeenCalled();
});
