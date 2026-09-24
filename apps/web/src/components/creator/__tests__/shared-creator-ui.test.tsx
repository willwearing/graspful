import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatorCourseCard as WebCourseCard } from '../course-card';
import { CreatorCourseCard as SiteCourseCard } from '../../../../../site/src/components/creator/course-card';
import { StatCard } from '../stat-card';
import { Card, CardAction, CardHeader, CardTitle } from '../../ui/card';

const fetchMock = vi.fn();
const props = { courseId: 'course-id', name: 'Example course', slug: 'example-course', isPublished: false, orgSlug: 'my-org', token: 'test-token' };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

for (const [app, CourseCard] of [['web', WebCourseCard], ['site', SiteCourseCard]] as const) {
  describe(`${app} shared course controls`, () => {
    it('links to the editor and requires the exact course slug before archiving', async () => {
      const onArchive = vi.fn();
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      render(<CourseCard {...props} onArchive={onArchive} />);
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('href', '/creator/manage/course-id');
      expect(screen.getByText('Draft')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
      const confirmation = await screen.findByPlaceholderText(props.slug);
      const archive = screen.getByRole('button', { name: 'Archive Course' });
      expect(archive).toBeDisabled();
      fireEvent.change(confirmation, { target: { value: 'wrong-course' } });
      expect(archive).toBeDisabled();
      expect(fetchMock).not.toHaveBeenCalled();
      fireEvent.change(confirmation, { target: { value: props.slug } });
      fireEvent.click(archive);
      await waitFor(() => expect(onArchive).toHaveBeenCalledOnce());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/orgs\/my-org\/courses\/course-id$/), expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }) );
    });

    it('keeps the course available when the server rejects an archive', async () => {
      const onArchive = vi.fn();
      fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
      render(<CourseCard {...props} isPublished onArchive={onArchive} />);
      expect(screen.getByText('Published')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
      fireEvent.change(await screen.findByPlaceholderText(props.slug), { target: { value: props.slug } });
      fireEvent.click(screen.getByRole('button', { name: 'Archive Course' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      await waitFor(() => expect(screen.getByRole('button', { name: 'Archive Course' })).toBeEnabled());
      expect(onArchive).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeVisible();
    });
  });
}

it('preserves shared card actions and creator statistics', () => {
  render(<><Card><CardHeader><CardTitle>Course settings</CardTitle><CardAction><button>Change</button></CardAction></CardHeader></Card><StatCard title="Learners" value="12" icon="Users" /></>);
  expect(screen.getByRole('button', { name: 'Change' })).toBeVisible();
  expect(screen.getByText('Learners')).toBeVisible();
  expect(screen.getByText('12')).toBeVisible();
});
