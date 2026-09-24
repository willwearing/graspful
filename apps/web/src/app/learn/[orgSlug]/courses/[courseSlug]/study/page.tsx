import { requireLearnAccess, resolveCourseBySlug } from '@/lib/learn-server';
import { learnLearnerRoutes } from '@/lib/learner-routes';
import { StudyView } from '@/lib/server-views/study';

export default async function Page({ params }: { params: Promise<{ orgSlug: string; courseSlug: string }> }) {
  const { orgSlug, courseSlug } = await params;
  const { serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);
  return StudyView({ courseId: course.id, courseSlug, orgSlug, fetcher: serverApiFetch, routes: learnLearnerRoutes(orgSlug, courseSlug, course.id) });
}
