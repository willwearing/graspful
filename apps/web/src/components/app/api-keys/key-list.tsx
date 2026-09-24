"use client";

import { useState } from "react";
import { Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApiKeyMeta } from "@/lib/hooks/use-api-keys";

export function KeyList({ keys, revoke, pending, error }: {
  keys: ApiKeyMeta[];
  revoke: (id: string) => Promise<boolean>;
  pending: boolean;
  error: string | null;
}) {
  const [target, setTarget] = useState<ApiKeyMeta | null>(null);
  if (!keys.length) return <div className="py-8 text-center"><Key className="mx-auto mb-3 size-8 text-muted-foreground" /><p>No API keys yet. Create one to use the CLI or MCP server.</p></div>;
  return (
    <>
      <div className="space-y-3">
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">{key.name}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <code>{key.keyPrefix}...</code>
                <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                <span>{key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : "Never used"}</span>
              </div>
            </div>
            <Button variant="destructive" size="sm" aria-label={`Revoke ${key.name}`} onClick={() => setTarget(key)}><Trash2 />Revoke</Button>
          </div>
        ))}
      </div>
      <Dialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>Revoke {target?.name}? Integrations that use this key will stop working immediately.</DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={pending} onClick={async () => { if (target && await revoke(target.id)) setTarget(null); }}>{pending ? "Revoking..." : "Revoke Key"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
