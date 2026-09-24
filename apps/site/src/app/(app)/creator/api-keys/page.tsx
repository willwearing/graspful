"use client";

import { ApiKeysPage as SharedApiKeysPage } from "@graspful/creator-ui/api-keys";
import { useBrowserSession } from "@graspful/creator-ui/use-browser-session";
import { useCreatorOrg } from "@/lib/contexts/creator-org-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";

export default function ApiKeysPage() {
  const { orgSlug } = useCreatorOrg();
  const session = useBrowserSession(createSupabaseBrowserClient);
  return <SharedApiKeysPage orgId={orgSlug} session={session} fetchApi={apiClientFetch} />;
}
