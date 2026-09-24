"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useApiKeys, type ApiKeysFetcher } from "./use-api-keys";
import type { BrowserSession } from "../use-browser-session";
import { CreateKeyDialog } from "./create-key-dialog";
import { KeyList } from "./key-list";
import { NewKey } from "./new-key";

export interface ApiKeysSettingsProps {
  orgId: string;
  session: BrowserSession | null;
  fetchApi: ApiKeysFetcher;
}

export function ApiKeysSettings({ orgId, session, fetchApi }: ApiKeysSettingsProps) {
  const token = session?.access_token ?? null;
  // Remount on tenant/session changes so keys and one-time secrets never carry over.
  return <ApiKeysManager key={`${orgId}:${session?.user.id ?? "signed-out"}`} orgId={orgId} token={token} fetchApi={fetchApi} />;
}

function ApiKeysManager({ orgId, token, fetchApi }: { orgId: string; token: string | null; fetchApi: ApiKeysFetcher }) {
  const state = useApiKeys(orgId, token, fetchApi);
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
