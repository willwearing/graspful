import { requireLearnAccess, resolveCourseBySlug } from '@/lib/learn-server';
import { learnLearnerRoutes } from '@/lib/learner-routes';
import { CourseView } from '@/lib/server-views/course';

export default async function Page({ params }: { params: Promise<{ orgSlug: string; courseSlug: string }> }) {
  const { orgSlug, courseSlug } = await params;
  const { serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);
  return <CourseView courseId={course.id} orgSlug={orgSlug} fetcher={serverApiFetch} routes={learnLearnerRoutes(orgSlug, courseSlug, course.id)} />;
}
