"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useBrand } from "@/lib/brand/context";
import { trackSignUp, trackSignIn } from "@/lib/posthog/events";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const brand = useBrand();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const presetEmail = searchParams.get("email") || "";
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  // Prevent open redirect: must be a relative path, not protocol-relative
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    setEmail(presetEmail);
  }, [presetEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Auto-confirm is on (dev) — redirect immediately
          trackSignUp(data.session.user.id);
          // Provision personal org + join the brand's org
          try {
            await apiClientFetch(`/auth/provision`, data.session.access_token, { method: "POST" });
          } catch {
            // Non-fatal
          }
          try {
            await apiClientFetch(`/orgs/${brand.orgSlug}/join`, data.session.access_token, { method: "POST" });
          } catch {
            // Non-fatal
          }
          router.push(redirectTo);
          router.refresh();
        } else {
          // Email confirmation required (production)
          setError("Check your email for a confirmation link.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          trackSignIn(data.session.user.id);
        }
        // Provision personal org (idempotent) + join the brand's org on sign-in
        if (data.session) {
          try {
            await apiClientFetch(`/auth/provision`, data.session.access_token, { method: "POST" });
          } catch {
            // Non-fatal
          }
          try {
            await apiClientFetch(`/orgs/${brand.orgSlug}/join`, data.session.access_token, { method: "POST" });
          } catch {
            // Non-fatal
          }
        }
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isSignIn = mode === "sign-in";
  const title = isSignIn ? "Welcome back" : "Create your account";
  const description = isSignIn
    ? `Sign in to continue studying with ${brand.name}`
    : `Start your free trial with ${brand.name}`;
  const submitText = isSignIn ? "Sign In" : "Create Account";
  const switchText = isSignIn ? "Don't have an account?" : "Already have an account?";
  const switchHref = isSignIn ? "/sign-up" : "/sign-in";
  const switchLabel = isSignIn ? "Sign up" : "Sign in";

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {reason === "session_expired" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              Your session expired. Sign in to pick up where you left off.
            </div>
          )}

          {reason === "invalid_reset_link" && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
              That reset link is invalid or expired.{" "}
              <Link href="/forgot-password" className="font-medium underline">
                Request a new one
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="At least 8 characters"
              />
            </div>

            {isSignIn && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : submitText}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {switchText}{" "}
            <Link
              href={switchHref}
              className="font-medium text-primary hover:underline"
            >
              {switchLabel}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
