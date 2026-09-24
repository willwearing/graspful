import { requireLearnAccess, resolveCourseBySlug } from '@/lib/learn-server';
import { learnLearnerRoutes } from '@/lib/learner-routes';
import { ReviewView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ orgSlug: string; courseSlug: string; conceptId: string }> }) {
  const { orgSlug, courseSlug, conceptId } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);
  return <ReviewView orgSlug={orgSlug} courseId={course.id} token={token} conceptId={conceptId} routes={learnLearnerRoutes(orgSlug, courseSlug, course.id)} />;
}
