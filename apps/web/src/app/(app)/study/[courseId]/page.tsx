import { requireAppSession } from '@/lib/app-session';
import { appLearnerRoutes } from '@/lib/learner-routes';
import { StudyView } from '@/lib/server-views/study';

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { brand, fetcher } = await requireAppSession();
  return StudyView({ courseId, orgSlug: brand.orgSlug, fetcher, routes: appLearnerRoutes(courseId) });
}
