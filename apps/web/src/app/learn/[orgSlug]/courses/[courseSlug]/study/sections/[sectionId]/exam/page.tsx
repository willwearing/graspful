import { requireLearnAccess, resolveCourseBySlug } from '@/lib/learn-server';
import { learnLearnerRoutes } from '@/lib/learner-routes';
import { ExamView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ orgSlug: string; courseSlug: string; sectionId: string }> }) {
  const { orgSlug, courseSlug, sectionId } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const course = await resolveCourseBySlug(orgSlug, courseSlug, serverApiFetch);
  return <ExamView orgSlug={orgSlug} courseId={course.id} token={token} sectionId={sectionId} routes={learnLearnerRoutes(orgSlug, courseSlug, course.id)} />;
}
