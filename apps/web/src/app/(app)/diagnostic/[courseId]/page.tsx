import { requireAppSession } from '@/lib/app-session';
import { appLearnerRoutes } from '@/lib/learner-routes';
import { DiagnosticView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { token, brand } = await requireAppSession();
  return <DiagnosticView orgSlug={brand.orgSlug} courseId={courseId} token={token} routes={appLearnerRoutes(courseId)} />;
}
