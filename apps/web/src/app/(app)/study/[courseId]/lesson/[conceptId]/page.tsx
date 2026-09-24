import { requireAppSession } from '@/lib/app-session';
import { appLearnerRoutes } from '@/lib/learner-routes';
import { LessonView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ courseId: string; conceptId: string }> }) {
  const { courseId, conceptId } = await params;
  const { token, brand } = await requireAppSession();
  return <LessonView orgSlug={brand.orgSlug} courseId={courseId} token={token} conceptId={conceptId} routes={appLearnerRoutes(courseId)} />;
}
