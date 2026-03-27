"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Plus, Key, Trash2, Check } from "lucide-react";
import { useCreatorOrg } from "@/lib/contexts/creator-org-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export default function ApiKeysPage() {
  const { orgSlug } = useCreatorOrg();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  // Create key dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  // Newly created key
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async (accessToken: string) => {
    try {
      const data = await apiClientFetch<ApiKey[]>(
        `/orgs/${orgSlug}/api-keys`,
        accessToken
      );
      setKeys(data);
    } catch {
      // Non-critical — show empty
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      setToken(accessToken);
      await fetchKeys(accessToken);
    }
    init();
  }, [fetchKeys]);

  async function handleCreate() {
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const result = await apiClientFetch<{ key: string; id: string }>(
        `/orgs/${orgSlug}/api-keys`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ name: keyName.trim() }),
        }
      );
      setNewKey(result.key);
      // Re-fetch the list since the create response only returns { key, id }
      await fetchKeys(token);
      setKeyName("");
      setCreateOpen(false);
    } catch {
      // Creation failed — user can retry
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await apiClientFetch(
        `/orgs/${orgSlug}/api-keys/${keyId}`,
        token,
        { method: "DELETE" }
      );
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch {
      // Revoke failed — user can retry
    }
  }

  function handleCopy() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for the CLI and MCP integrations.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4" />
            Create API Key
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Give your key a name so you can identify it later.
              </DialogDescription>
            </DialogHeader>

            <Input
              placeholder="e.g. My Laptop CLI"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />

            <DialogFooter>
              <Button onClick={handleCreate} disabled={!keyName.trim() || creating}>
                {creating ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick-start block */}
      <Card className="mb-8 bg-muted/50">
        <CardContent>
          <p className="font-medium text-foreground mb-2">Quick Start</p>
          <pre className="rounded-lg bg-background p-4 text-xs text-foreground font-mono overflow-x-auto">
{`export GRASPFUL_API_KEY="gsk_..."
npx @graspful/cli login
npx @graspful/cli import course.yaml`}
          </pre>
        </CardContent>
      </Card>

      {/* New key warning */}
      {newKey && (
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardContent>
            <p className="font-medium text-foreground mb-1">
              Your new API key (shown once):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-background px-3 py-2 font-mono text-sm text-foreground break-all">
                {newKey}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Copy this key now. You will not be able to see it again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key list */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Key className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No API keys yet. Create one to use the CLI or MCP server.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{key.name}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <code className="font-mono">{key.keyPrefix}...</code>
                    <span>Created {formatDate(key.createdAt)}</span>
                    <span>
                      {key.lastUsedAt
                        ? `Last used ${formatDate(key.lastUsedAt)}`
                        : "Never used"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevoke(key.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
