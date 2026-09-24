import { requireAppSession } from '@/lib/app-session';
import { appLearnerRoutes } from '@/lib/learner-routes';
import { ExamView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ courseId: string; sectionId: string }> }) {
  const { courseId, sectionId } = await params;
  const { token, brand } = await requireAppSession();
  return <ExamView orgSlug={brand.orgSlug} courseId={courseId} token={token} sectionId={sectionId} routes={appLearnerRoutes(courseId)} />;
}
