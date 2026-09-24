import { requireAppSession } from "@/lib/app-session";
import { StudyRouter } from "@/components/app/study-router";
import type { NextTask } from "@/lib/types";

export default async function AcademyStudyPage({
  params,
}: {
  params: Promise<{ academyId: string }>;
}) {
  const { academyId } = await params;

  const { fetcher: serverApiFetch, brand } = await requireAppSession();

  let task: NextTask | null = null;
  let loadFailed = false;
  try {
    task = await serverApiFetch<NextTask>(
      `/orgs/${brand.orgSlug}/academies/${academyId}/next-task`,
    );
  } catch {
    loadFailed = true;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <StudyRouter academyId={academyId} task={task} loadFailed={loadFailed} />
    </div>
  );
}
