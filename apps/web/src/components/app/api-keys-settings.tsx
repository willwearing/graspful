"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthToken } from "@/lib/hooks/use-auth-token";
import { PlusIcon, CopyIcon, CheckIcon, Trash2Icon, KeyIcon } from "lucide-react";

interface ApiKeyMeta {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function ApiKeysSettings({ orgId }: { orgId: string }) {
  const token = useAuthToken();
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  // Newly created key (shown once)
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyMeta | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiClientFetch<ApiKeyMeta[]>(
        `/orgs/${orgId}/api-keys`,
        token,
      );
      setKeys(data);
      setError(null);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!token || !newKeyName.trim()) return;
    setCreating(true);
    try {
      const { key } = await apiClientFetch<{ key: string; id: string }>(
        `/orgs/${orgId}/api-keys`,
        token,
        { method: "POST", body: JSON.stringify({ name: newKeyName.trim() }) },
      );
      setCreatedKey(key);
      setNewKeyName("");
      await fetchKeys();
    } catch {
      setError("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!token || !revokeTarget) return;
    setRevoking(true);
    try {
      await apiClientFetch(
        `/orgs/${orgId}/api-keys/${revokeTarget.id}`,
        token,
        { method: "DELETE" },
      );
      setRevokeTarget(null);
      await fetchKeys();
    } catch {
      setError("Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  };

  const handleCreateDialogClose = () => {
    setCreateOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
    setCopied(false);
  };

  const formatKeyDisplay = (prefix: string) => {
    const last4 = prefix.slice(-4);
    return `gsk_...${last4}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Loading API keys...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for programmatic access
              </CardDescription>
            </div>
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                if (!open) handleCreateDialogClose();
                else setCreateOpen(true);
              }}
            >
              <DialogTrigger render={<Button size="sm" />}>
                <PlusIcon data-icon="inline-start" />
                Create Key
              </DialogTrigger>
              <DialogContent>
                {createdKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>API Key Created</DialogTitle>
                      <DialogDescription>
                        Save this key now. You will not be able to see it again.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-xs font-mono break-all">
                          {createdKey}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopy}
                        >
                          {copied ? (
                            <CheckIcon className="size-4 text-green-600" />
                          ) : (
                            <CopyIcon className="size-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-destructive font-medium">
                        This is the only time this key will be shown.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateDialogClose} size="sm">
                        Done
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Give your key a name to identify it later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Input
                        placeholder="e.g. CI/CD Pipeline"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newKeyName.trim()) {
                            handleCreate();
                          }
                        }}
                        maxLength={100}
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreate}
                        disabled={!newKeyName.trim() || creating}
                        size="sm"
                      >
                        {creating ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <KeyIcon className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a key to access the API programmatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {k.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <code className="font-mono">
                        {formatKeyDisplay(k.keyPrefix)}
                      </code>
                      <span>
                        Created{" "}
                        {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                      {k.lastUsedAt && (
                        <span>
                          Last used{" "}
                          {new Date(k.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => setRevokeTarget(k)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke confirmation dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke{" "}
              <span className="font-medium text-foreground">
                {revokeTarget?.name}
              </span>
              ? Any integrations using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevokeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
