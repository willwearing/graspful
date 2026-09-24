"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClientFetch } from "@/lib/api-client";

export interface ApiKeyMeta {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function useApiKeys(orgId: string, token: string | null) {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const mutation = useRef(false);
  const listVersion = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    const version = ++listVersion.current;
    const data = await apiClientFetch<ApiKeyMeta[]>(`/orgs/${orgId}/api-keys`, token);
    if (active.current && version === listVersion.current) setKeys(data);
  }, [orgId, token]);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    setLoading(true);
    const version = ++listVersion.current;
    apiClientFetch<ApiKeyMeta[]>(`/orgs/${orgId}/api-keys`, token)
      .then((data) => { if (!cancelled && version === listVersion.current) { setKeys(data); setError(null); } })
      .catch(() => { if (!cancelled) setError("Failed to load API keys"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orgId, token]);

  async function mutate(operation: () => Promise<void>, failure: string) {
    if (!token || mutation.current) return false;
    mutation.current = true;
    setPending(true);
    setError(null);
    try {
      await operation();
      return true;
    } catch {
      if (active.current) setError(failure);
      return false;
    } finally {
      mutation.current = false;
      if (active.current) setPending(false);
    }
  }

  async function create(name: string) {
    if (!name.trim()) return false;
    return mutate(async () => {
      const result = await apiClientFetch<{ key: string; id: string }>(`/orgs/${orgId}/api-keys`, token!, {
        method: "POST", body: JSON.stringify({ name: name.trim() }),
      });
      if (active.current) setNewKey(result.key);
      try { await fetchKeys(); }
      catch { if (active.current) setError("Key created. Could not refresh the list."); }
    }, "Failed to create API key");
  }

  async function revoke(id: string) {
    return mutate(async () => {
      await apiClientFetch(`/orgs/${orgId}/api-keys/${id}`, token!, { method: "DELETE" });
      listVersion.current += 1;
      if (active.current) setKeys((current) => current.filter((key) => key.id !== id));
    }, "Failed to revoke API key");
  }
  return { keys, loading, error, newKey, pending, create, revoke };
}
