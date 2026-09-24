"use client";

import { ApiKeysPage as SharedApiKeysPage } from "@graspful/creator-ui/api-keys";
import { useCreatorOrg } from "@/lib/contexts/creator-org-context";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthSession } from "@/lib/hooks/use-auth-token";

export default function ApiKeysPage() {
  const { orgSlug } = useCreatorOrg();
  const session = useAuthSession();
  return <SharedApiKeysPage orgId={orgSlug} session={session} fetchApi={apiClientFetch} />;
}
