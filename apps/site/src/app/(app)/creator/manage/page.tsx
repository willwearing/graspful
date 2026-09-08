"use client";

import { useRouter } from "next/navigation";
import { CreatorCourseEditor } from "@graspful/creator-ui";
import { useCreatorOrg } from "@/lib/contexts/creator-org-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";

async function getAccessToken() {
  const { data } = await createSupabaseBrowserClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function NewCoursePage() {
  const { orgSlug } = useCreatorOrg();
  const router = useRouter();
  return (
    <CreatorCourseEditor
      key={orgSlug}
      orgSlug={orgSlug}
      getAccessToken={getAccessToken}
      apiFetch={apiClientFetch}
      onImported={(id) => router.push(`/creator/manage/${id}`)}
    />
  );
}
