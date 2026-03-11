"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createBrowserClient } from "@supabase/ssr";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";

async function billingFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  maxMembers: number;
}

export function BillingSettings({ orgId }: { orgId: string }) {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const data = await billingFetch<SubscriptionInfo>(
          `/orgs/${orgId}/billing/subscription`,
          session.access_token,
        );
        setSub(data);
      } catch {
        setSub({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, maxMembers: 1 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  const getToken = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleManage = async () => {
    const token = await getToken();
    if (!token) return;

    const { url } = await billingFetch<{ url: string }>(
      `/orgs/${orgId}/billing/portal`,
      token,
      { method: "POST", body: JSON.stringify({ returnUrl: window.location.origin + "/settings" }) },
    );
    window.location.href = url;
  };

  const handleUpgrade = async (plan: "individual" | "team") => {
    const token = await getToken();
    if (!token) return;

    const { url } = await billingFetch<{ url: string }>(
      `/orgs/${orgId}/billing/checkout`,
      token,
      { method: "POST", body: JSON.stringify({ plan, returnUrl: window.location.origin }) },
    );
    window.location.href = url;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Loading subscription details...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusLabel =
    sub?.status === "trialing"
      ? "Trial"
      : sub?.status === "active"
        ? "Active"
        : sub?.status === "past_due"
          ? "Past Due"
          : sub?.status === "canceled"
            ? "Canceled"
            : sub?.status ?? "Free";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your subscription</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Current Plan</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground capitalize">
              {sub?.plan ?? "free"}
            </span>
            <Badge>{statusLabel}</Badge>
          </div>
        </div>

        {sub?.trialEndsAt && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Trial Ends</span>
            <span className="text-sm text-foreground">
              {new Date(sub.trialEndsAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {sub?.currentPeriodEnd && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Next Billing Date</span>
            <span className="text-sm text-foreground">
              {new Date(sub.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
        )}

        {sub?.cancelAtPeriodEnd && (
          <p className="text-sm text-destructive">
            Your subscription will be canceled at the end of the current billing period.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {sub?.plan === "free" ? (
            <Button onClick={() => handleUpgrade("individual")} size="sm">
              Upgrade to Individual
            </Button>
          ) : (
            <Button onClick={handleManage} variant="outline" size="sm">
              Manage Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
