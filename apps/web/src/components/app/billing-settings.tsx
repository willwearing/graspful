"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthToken } from "@/lib/hooks/use-auth-token";
import { trackCheckoutInitiated, trackBillingPortalOpened } from "@/lib/posthog/events";

interface SubscriptionInfo {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  maxMembers: number;
  billing?: {
    checkoutAvailable: boolean;
    portalAvailable: boolean;
  };
}

export function BillingSettings({ orgId }: { orgId: string }) {
  const token = useAuthToken();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pendingAction, setPendingAction] = useState<"checkout" | "portal" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setSub(null);
    setActionError(null);
    setPendingAction(null);
    if (!token) return;
    async function load() {
      try {
        const data = await apiClientFetch<SubscriptionInfo>(
          `/orgs/${orgId}/billing/subscription`,
          token!,
        );
        if (active) setSub(data);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [orgId, token, loadAttempt]);

  const handleManage = async () => {
    if (!token || !sub?.billing?.portalAvailable || pendingAction) return;
    setPendingAction("portal");
    setActionError(null);
    try {
      const { url } = await apiClientFetch<{ url: string }>(
        `/orgs/${orgId}/billing/portal`,
        token,
        { method: "POST", body: JSON.stringify({ returnUrl: "/settings" }) },
      );
      if (!url) throw new Error("Missing billing portal URL");
      trackBillingPortalOpened();
      window.location.href = url;
    } catch {
      setActionError("We could not open subscription management. Please try again.");
      setPendingAction(null);
    }
  };

  const handleUpgrade = async (plan: "individual" | "team") => {
    if (!token || !sub?.billing?.checkoutAvailable || pendingAction) return;
    setPendingAction("checkout");
    setActionError(null);
    try {
      const { url } = await apiClientFetch<{ url: string }>(
        `/orgs/${orgId}/billing/checkout`,
        token,
        { method: "POST", body: JSON.stringify({ plan, returnUrl: "/settings" }) },
      );
      if (!url) throw new Error("Missing checkout URL");
      trackCheckoutInitiated(plan);
      window.location.href = url;
    } catch {
      setActionError("We could not open checkout. Please try again.");
      setPendingAction(null);
    }
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

  if (loadError || !sub) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p role="alert" className="text-sm text-destructive">
            We could not load your subscription details.
          </p>
          <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)} variant="outline" size="sm">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusLabel =
    sub.status === "trialing"
      ? "Trial"
      : sub.status === "active"
        ? "Active"
        : sub.status === "past_due"
          ? "Past due"
          : sub.status === "canceled"
            ? "Canceled"
            : sub.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your subscription</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Current plan</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground capitalize">
              {sub.plan}
            </span>
            <Badge>{statusLabel}</Badge>
          </div>
        </div>

        {sub?.trialEndsAt && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Trial ends</span>
            <span className="text-sm text-foreground">
              {new Date(sub.trialEndsAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {sub?.currentPeriodEnd && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current period ends</span>
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

        {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}

        <div className="pt-2">
          {sub.plan === "free" ? (
            sub.billing?.checkoutAvailable ? (
              <Button onClick={() => handleUpgrade("individual")} disabled={pendingAction !== null} size="sm">
                {pendingAction === "checkout" ? "Opening checkout..." : "Upgrade to Individual"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Paid subscriptions are not available yet.</p>
            )
          ) : (
            sub.billing?.portalAvailable ? (
              <Button onClick={handleManage} disabled={pendingAction !== null} variant="outline" size="sm">
                {pendingAction === "portal" ? "Opening subscription management..." : "Manage subscription"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Subscription management is not available yet.</p>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
