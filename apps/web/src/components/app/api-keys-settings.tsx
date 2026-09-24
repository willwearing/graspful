"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKeys } from "@/lib/hooks/use-api-keys";
import { useAuthSession } from "@/lib/hooks/use-auth-token";
import { CreateKeyDialog } from "./api-keys/create-key-dialog";
import { KeyList } from "./api-keys/key-list";
import { NewKey } from "./api-keys/new-key";

export function ApiKeysSettings({ orgId }: { orgId: string }) {
  const session = useAuthSession();
  const token = session?.access_token ?? null;
  // Remount on tenant/session changes so keys and one-time secrets never carry over.
  return <ApiKeysManager key={`${orgId}:${session?.user.id ?? "signed-out"}`} orgId={orgId} token={token} />;
}

function ApiKeysManager({ orgId, token }: { orgId: string; token: string | null }) {
  const state = useApiKeys(orgId, token);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div><CardTitle>API Keys</CardTitle><CardDescription>Manage API keys for programmatic access</CardDescription></div>
          <CreateKeyDialog error={state.error} create={state.create} pending={state.pending} disabled={state.loading || !token} />
        </div>
      </CardHeader>
      <CardContent>
        {state.error && <p role="alert" className="mb-4 text-sm text-destructive">{state.error}</p>}
        {state.newKey && <NewKey key={state.newKey} value={state.newKey} />}
        {state.loading ? <p>Loading API keys...</p> : <KeyList error={state.error} keys={state.keys} revoke={state.revoke} pending={state.pending} />}
      </CardContent>
    </Card>
  );
}
