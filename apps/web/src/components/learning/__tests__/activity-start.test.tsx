import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActivityStart, type ActivityKind } from '../activity-start';
import { apiClientFetch } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({ apiClientFetch: vi.fn() }));
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

beforeEach(() => { vi.mocked(apiClientFetch).mockReset(); });

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
