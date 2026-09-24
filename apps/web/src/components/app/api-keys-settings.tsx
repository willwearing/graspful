"use client";

import { ApiKeysSettings as SharedApiKeysSettings } from "@graspful/creator-ui/api-keys";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthSession } from "@/lib/hooks/use-auth-token";

export function ApiKeysSettings({ orgId }: { orgId: string }) {
  const session = useAuthSession();
  return <SharedApiKeysSettings orgId={orgId} session={session} fetchApi={apiClientFetch} />;
}
