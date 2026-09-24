import { requireAppSession } from '@/lib/app-session';
import { appLearnerRoutes } from '@/lib/learner-routes';
import { CourseView } from '@/lib/server-views/course';

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { brand, fetcher } = await requireAppSession();
  return <CourseView courseId={courseId} orgSlug={brand.orgSlug} fetcher={fetcher} routes={appLearnerRoutes(courseId)} />;
}
