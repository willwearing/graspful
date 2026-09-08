"use client";

import { useParams, useRouter } from "next/navigation";
import { CreatorCourseEditor } from "@graspful/creator-ui";
import { useCreatorOrg } from "@/lib/contexts/creator-org-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";

async function getAccessToken() {
  const { data } = await createSupabaseBrowserClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function EditCoursePage() {
  const { orgSlug } = useCreatorOrg();
  const router = useRouter();
  const { courseId } = useParams<{ courseId: string }>();
  return (
    <CreatorCourseEditor
      key={`${orgSlug}/${courseId}`}
      orgSlug={orgSlug}
      courseId={courseId}
      getAccessToken={getAccessToken}
      apiFetch={apiClientFetch}
      onImported={(id) => router.push(`/creator/manage/${id}`)}
    />
  );
}
