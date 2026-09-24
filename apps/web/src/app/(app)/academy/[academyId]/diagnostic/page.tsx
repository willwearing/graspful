import { requireAppSession } from '@/lib/app-session';
import { DiagnosticView } from '@/lib/server-views/activity';

export default async function Page({ params }: { params: Promise<{ academyId: string }> }) {
  const { academyId } = await params;
  const { token, brand } = await requireAppSession();
  return <DiagnosticView orgSlug={brand.orgSlug} courseId="" academyId={academyId} token={token} routes={{ course: `/academy/${encodeURIComponent(academyId)}`, study: `/academy/${encodeURIComponent(academyId)}/study` }} />;
}
