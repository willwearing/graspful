import { requireLearnAccess, resolveCourseBySlug } from '@/lib/learn-server';
import { learnLearnerRoutes } from '@/lib/learner-routes';
import { DiagnosticView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ orgSlug: string; courseSlug: string }> }) {
  const { orgSlug, courseSlug } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);
  return <DiagnosticView orgSlug={orgSlug} courseId={course.id} token={token} routes={learnLearnerRoutes(orgSlug, courseSlug, course.id)} />;
}
