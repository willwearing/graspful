import { requireLearnAccess, resolveAcademyBySlug } from '@/lib/learn-server';
import { getLearnAcademyHref, getLearnAcademyStudyHref } from '@/lib/learn-routes';
import { DiagnosticView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ orgSlug: string; academySlug: string }> }) {
  const { orgSlug, academySlug } = await params;
  const { token, serverApiFetch } = await requireLearnAccess(orgSlug);
  const academy = await resolveAcademyBySlug(orgSlug, academySlug, serverApiFetch);
  return <DiagnosticView orgSlug={orgSlug} courseId="" academyId={academy.id} academyName={academy.name} token={token} routes={{ course: getLearnAcademyHref(orgSlug, academySlug), study: getLearnAcademyStudyHref(orgSlug, academySlug) }} />;
}
